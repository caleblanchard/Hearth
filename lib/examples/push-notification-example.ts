/**
 * Example: How to integrate push notifications into existing modules
 *
 * This file shows examples of how to send push notifications
 * from different parts of the application.
 */

import { sendPushNotificationToUser, sendPushNotificationToFamily } from '@/lib/push-notifications';
import { NotificationType } from '@/app/generated/prisma';

/**
 * Example 1: Send notification when a leftover is expiring
 * This would be called from a cron job that checks for expiring leftovers
 */
export async function notifyLeftoverExpiring(leftover: {
  id: string;
  name: string;
  familyId: string;
  createdBy: string;
  expiresAt: Date;
}) {
  const hoursUntilExpiration = Math.floor(
    (leftover.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
  );

  await sendPushNotificationToFamily(
    leftover.familyId,
    NotificationType.LEFTOVER_EXPIRING,
    {
      title: '🥗 Leftover Expiring Soon',
      body: `${leftover.name} will expire in ${hoursUntilExpiration} hours`,
      data: {
        url: '/dashboard/meals/leftovers',
        leftoverId: leftover.id,
      },
      tag: `leftover-${leftover.id}`,
    }
  );
}

/**
 * Example 2: Send notification when a document is expiring
 * Called from a cron job that checks for expiring documents
 */
export async function notifyDocumentExpiring(document: {
  id: string;
  name: string;
  familyId: string;
  expiresAt: Date | null;
}) {
  if (!document.expiresAt) return;

  const daysUntilExpiration = Math.floor(
    (document.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  await sendPushNotificationToFamily(
    document.familyId,
    NotificationType.DOCUMENT_EXPIRING,
    {
      title: '📄 Document Expiring Soon',
      body: `${document.name} will expire in ${daysUntilExpiration} days`,
      data: {
        url: '/dashboard/documents',
        documentId: document.id,
      },
      tag: `document-${document.id}`,
      actions: [
        { action: 'view', title: 'View Document' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    },
    {
      roleFilter: 'PARENT', // Only notify parents about document expiration
    }
  );
}

/**
 * Example 3: Send notification when medication becomes available
 * Called when medication cooldown completes
 */
export async function notifyMedicationAvailable(medication: {
  id: string;
  medicationName: string;
  userId: string;
  nextDoseAt: Date | null;
}) {
  if (!medication.nextDoseAt || medication.nextDoseAt > new Date()) {
    return;
  }

  await sendPushNotificationToUser(
    medication.userId,
    NotificationType.MEDICATION_AVAILABLE,
    {
      title: '💊 Medication Available',
      body: `${medication.medicationName} is now available to give`,
      data: {
        url: '/dashboard/medications',
        medicationId: medication.id,
      },
      tag: `medication-${medication.id}`,
      actions: [
        { action: 'log-dose', title: 'Log Dose' },
        { action: 'snooze', title: 'Remind Later' },
      ],
    }
  );
}

/**
 * Example 4: Send notification for carpool reminder
 * Called from a cron job X minutes before carpool time
 */
export async function notifyCarpool(schedule: {
  id: string;
  memberId: string;
  type: string;
  location: string;
  time: string;
  familyId: string;
}) {
  const emoji = schedule.type === 'PICKUP' ? '🚗' : '🏠';

  await sendPushNotificationToFamily(
    schedule.familyId,
    NotificationType.CARPOOL_REMINDER,
    {
      title: `${emoji} Carpool Reminder`,
      body: `${schedule.type === 'PICKUP' ? 'Pick up' : 'Drop off'} at ${schedule.location} at ${schedule.time}`,
      data: {
        url: '/dashboard/transport',
        scheduleId: schedule.id,
      },
      tag: `carpool-${schedule.id}`,
      actions: [
        { action: 'view', title: 'View Schedule' },
        { action: 'dismiss', title: 'Got it' },
      ],
    }
  );
}

/**
 * Example 5: Send notification when a routine should start
 * Called from a cron job at routine time
 */
export async function notifyRoutineTime(routine: {
  id: string;
  name: string;
  assignedTo: string;
  type: string;
}) {
  const emoji = routine.type === 'MORNING' ? '☀️' : routine.type === 'BEDTIME' ? '🌙' : '✅';

  await sendPushNotificationToUser(
    routine.assignedTo,
    NotificationType.ROUTINE_TIME,
    {
      title: `${emoji} Routine Time`,
      body: `It's time for your ${routine.name}`,
      data: {
        url: `/dashboard/routines/${routine.id}`,
        routineId: routine.id,
      },
      tag: `routine-${routine.id}`,
      requireInteraction: true, // Keep notification visible
    }
  );
}

/**
 * Example 6: Send notification when maintenance is due
 * Called from a cron job that checks for overdue/upcoming maintenance
 */
export async function notifyMaintenanceDue(item: {
  id: string;
  name: string;
  familyId: string;
  nextDueAt: Date | null;
}) {
  if (!item.nextDueAt) return;

  const isOverdue = item.nextDueAt < new Date();

  await sendPushNotificationToFamily(
    item.familyId,
    NotificationType.MAINTENANCE_DUE,
    {
      title: isOverdue ? '⚠️ Maintenance Overdue' : '🔧 Maintenance Due Soon',
      body: `${item.name} ${isOverdue ? 'is overdue' : 'is due soon'}`,
      data: {
        url: '/dashboard/maintenance',
        itemId: item.id,
      },
      tag: `maintenance-${item.id}`,
      actions: [
        { action: 'complete', title: 'Mark Complete' },
        { action: 'view', title: 'View Details' },
      ],
    },
    {
      roleFilter: 'PARENT', // Only notify parents about maintenance
    }
  );
}

/**
 * Example 7: Send notification when an automation rule is triggered
 * Called when a rule executes successfully
 */
export async function notifyRuleTriggered(rule: {
  id: string;
  name: string;
  familyId: string;
  createdById: string;
  result: any;
}) {
  await sendPushNotificationToUser(
    rule.createdById,
    NotificationType.RULE_TRIGGERED,
    {
      title: '🤖 Automation Rule Triggered',
      body: `Rule "${rule.name}" was executed`,
      data: {
        url: `/dashboard/rules/${rule.id}/history`,
        ruleId: rule.id,
      },
      tag: `rule-${rule.id}`,
    }
  );
}

/**
 * Example 8: Cron job example - Check and send notifications for expiring items
 * This would be called from /api/cron/send-notifications
 */
export async function checkAndSendExpiringNotifications() {
  // This is a pseudo-code example of how a cron job might work
  const prisma = (await import('@/lib/prisma')).default;

  // Get user preferences to determine notification timings
  const preferences = await prisma.notificationPreference.findMany();

  for (const pref of preferences) {
    // Check leftovers expiring within user's preferred hours
    const expiringLeftovers = await prisma.leftover.findMany({
      where: {
        family: { members: { some: { id: pref.userId } } },
        usedAt: null,
        tossedAt: null,
        expiresAt: {
          lte: new Date(Date.now() + pref.leftoverExpiringHours * 60 * 60 * 1000),
          gt: new Date(),
        },
      },
    });

    for (const leftover of expiringLeftovers) {
      await notifyLeftoverExpiring(leftover);
    }

    // Check documents expiring within user's preferred days
    const expiringDocuments = await prisma.document.findMany({
      where: {
        family: { members: { some: { id: pref.userId } } },
        expiresAt: {
          lte: new Date(Date.now() + pref.documentExpiringDays * 24 * 60 * 60 * 1000),
          gt: new Date(),
        },
      },
    });

    for (const doc of expiringDocuments) {
      await notifyDocumentExpiring(doc);
    }
  }
}
