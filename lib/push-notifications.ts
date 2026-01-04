import webpush from 'web-push';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotificationType } from '@/app/generated/prisma';

// Configure VAPID details (these should be set in environment variables)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@hearth.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(quietHoursStart: string | null, quietHoursEnd: string | null): boolean {
  if (!quietHoursStart || !quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: string,
  notificationType: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  try {
    // Get user's notification preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Check if push notifications are enabled
    if (preferences && !preferences.pushEnabled) {
      logger.info('Push notifications disabled for user', { userId });
      return;
    }

    // Check if this notification type is enabled
    if (
      preferences &&
      preferences.enabledTypes.length > 0 &&
      !preferences.enabledTypes.includes(notificationType)
    ) {
      logger.info('Notification type disabled for user', { userId, notificationType });
      return;
    }

    // Check quiet hours
    if (
      preferences?.quietHoursEnabled &&
      isQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd)
    ) {
      logger.info('Notification skipped due to quiet hours', { userId, notificationType });
      return;
    }

    // Get all push subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      logger.info('No push subscriptions found for user', { userId });
      return;
    }

    // Send push notification to all user's devices
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushPayload = {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/icon-192x192.png',
          data: {
            ...payload.data,
            type: notificationType,
            url: payload.data?.url || '/dashboard',
          },
          tag: payload.tag,
          actions: payload.actions,
        };

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(pushPayload)
        );

        logger.info('Push notification sent successfully', {
          userId,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          notificationType,
        });
      } catch (error) {
        // Handle gone/expired subscriptions
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
          logger.warn('Push subscription expired, removing', {
            userId,
            endpoint: subscription.endpoint,
          });
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        } else {
          logger.error('Failed to send push notification', {
            userId,
            endpoint: subscription.endpoint.substring(0, 50) + '...',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    logger.error('Error sending push notification to user', { userId, error });
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notificationType: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  const sendPromises = userIds.map((userId) =>
    sendPushNotificationToUser(userId, notificationType, payload)
  );

  await Promise.allSettled(sendPromises);
}

/**
 * Send push notification to all family members
 */
export async function sendPushNotificationToFamily(
  familyId: string,
  notificationType: NotificationType,
  payload: NotificationPayload,
  options?: {
    excludeUserIds?: string[];
    roleFilter?: 'PARENT' | 'CHILD';
  }
): Promise<void> {
  try {
    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        isActive: true,
        ...(options?.roleFilter && { role: options.roleFilter }),
        ...(options?.excludeUserIds && {
          id: { notIn: options.excludeUserIds },
        }),
      },
      select: { id: true },
    });

    const userIds = members.map((m) => m.id);
    await sendPushNotificationToUsers(userIds, notificationType, payload);
  } catch (error) {
    logger.error('Error sending push notification to family', { familyId, error });
  }
}

/**
 * Generate VAPID keys (run this once to generate keys for your app)
 * This is a utility function for setup, not used in production code
 */
export function generateVAPIDKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log('VAPID Public Key:', vapidKeys.publicKey);
  console.log('VAPID Private Key:', vapidKeys.privateKey);
  console.log('\nAdd these to your .env.local file:');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
  return vapidKeys;
}
