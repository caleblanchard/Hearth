/**
 * Centralized notification helper
 * Handles notification creation with sick mode muting support
 */

import prisma from '@/lib/prisma';
import { shouldMuteNonEssentialNotifications } from '@/lib/sick-mode';
import { logger } from '@/lib/logger';

export type NotificationType =
  | 'CHORE_COMPLETED'
  | 'CHORE_APPROVED'
  | 'CHORE_REJECTED'
  | 'CHORE_ASSIGNED'
  | 'REWARD_REQUESTED'
  | 'REWARD_APPROVED'
  | 'REWARD_REJECTED'
  | 'CREDITS_EARNED'
  | 'CREDITS_SPENT'
  | 'SCREENTIME_ADJUSTED'
  | 'SCREENTIME_LOW'
  | 'TODO_ASSIGNED'
  | 'SHOPPING_REQUEST'
  | 'GENERAL'
  | 'LEFTOVER_EXPIRING'
  | 'DOCUMENT_EXPIRING'
  | 'MEDICATION_AVAILABLE'
  | 'ROUTINE_TIME'
  | 'MAINTENANCE_DUE'
  | 'PET_CARE_REMINDER'
  | 'CARPOOL_REMINDER'
  | 'SAVINGS_GOAL_ACHIEVED'
  | 'BUSY_DAY_ALERT'
  | 'RULE_TRIGGERED';

/**
 * Essential notification types that should NEVER be muted
 * even when sick mode notification muting is enabled
 */
const ESSENTIAL_NOTIFICATION_TYPES: NotificationType[] = [
  'MEDICATION_AVAILABLE',
  'MAINTENANCE_DUE',
  'LEFTOVER_EXPIRING',
  'DOCUMENT_EXPIRING',
  'REWARD_APPROVED',
  'REWARD_REJECTED',
  'CHORE_APPROVED',
  'CHORE_REJECTED',
];

/**
 * Non-essential notification types that can be muted during sick mode
 */
const NON_ESSENTIAL_NOTIFICATION_TYPES: NotificationType[] = [
  'CHORE_COMPLETED',
  'CHORE_ASSIGNED',
  'CREDITS_EARNED',
  'SCREENTIME_ADJUSTED',
  'SCREENTIME_LOW',
  'TODO_ASSIGNED',
  'SHOPPING_REQUEST',
  'ROUTINE_TIME',
  'GENERAL',
  'PET_CARE_REMINDER',
  'CARPOOL_REMINDER',
  'SAVINGS_GOAL_ACHIEVED',
  'BUSY_DAY_ALERT',
  'RULE_TRIGGERED',
];

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

/**
 * Create a notification with sick mode muting support
 * 
 * @param params - Notification parameters
 * @returns Created notification or null if muted
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, actionUrl, metadata } = params;

  // Check if notification should be muted due to sick mode
  if (NON_ESSENTIAL_NOTIFICATION_TYPES.includes(type)) {
    const shouldMute = await shouldMuteNonEssentialNotifications(userId);
    
    if (shouldMute) {
      logger.info(
        `Notification muted due to sick mode: ${type} for user ${userId}`
      );
      return null;
    }
  }

  // Create the notification
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl,
        metadata,
      },
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Check if a notification type is essential (never muted)
 */
export function isEssentialNotification(type: NotificationType): boolean {
  return ESSENTIAL_NOTIFICATION_TYPES.includes(type);
}

/**
 * Check if a notification type is non-essential (can be muted)
 */
export function isNonEssentialNotification(type: NotificationType): boolean {
  return NON_ESSENTIAL_NOTIFICATION_TYPES.includes(type);
}
