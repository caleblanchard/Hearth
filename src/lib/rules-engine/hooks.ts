/**
 * Rules Engine Integration Hooks
 *
 * Async hooks that trigger rule evaluation from existing endpoints.
 * These fire-and-forget functions don't block the calling code.
 */

import { evaluateRules } from './index';
import { RuleContext } from './types';

// ============================================
// ASYNC WRAPPER - FIRE AND FORGET
// ============================================

/**
 * Wrapper for async rule evaluation that doesn't block calling code
 * Logs errors but doesn't throw them
 */
async function triggerRuleEvaluation(
  triggerType: any,
  context: RuleContext
): Promise<void> {
  // Use setImmediate to fire and forget
  setImmediate(async () => {
    try {
      await evaluateRules(triggerType, context);
    } catch (error) {
      console.error(`Rule evaluation failed for trigger ${triggerType}:`, error);
      // In production, this should be sent to error tracking service
    }
  });
}

// ============================================
// CHORE COMPLETED HOOK
// ============================================

/**
 * Called when a chore is completed and approved
 * Integrates with: /api/chores/[id]/approve
 */
export async function onChoreCompleted(
  choreInstance: {
    id: string;
    assignedToId: string;
    choreDefinitionId: string;
  },
  familyId: string
): Promise<void> {
  await triggerRuleEvaluation('chore_completed', {
    familyId,
    memberId: choreInstance.assignedToId,
    choreInstanceId: choreInstance.id,
    choreDefinitionId: choreInstance.choreDefinitionId,
    triggerId: choreInstance.id,
  });
}

// ============================================
// CHORE STREAK HOOK
// ============================================

/**
 * Called when a chore streak is updated
 * Integrates with: /lib/achievements.ts
 */
export async function onChoreStreak(
  memberId: string,
  familyId: string,
  streak: {
    currentStreak: number;
    longestStreak: number;
  }
): Promise<void> {
  await triggerRuleEvaluation('chore_streak', {
    familyId,
    memberId,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    triggerId: `streak-${memberId}`,
  });
}

// ============================================
// SCREEN TIME UPDATED HOOK
// ============================================

/**
 * Called when screen time balance is updated
 * Integrates with: /api/screentime/log
 */
export async function onScreenTimeUpdated(
  memberId: string,
  familyId: string,
  currentBalance: number
): Promise<void> {
  await triggerRuleEvaluation('screentime_low', {
    familyId,
    memberId,
    currentBalance,
    triggerId: `screentime-${memberId}`,
  });
}

// ============================================
// INVENTORY UPDATED HOOK
// ============================================

/**
 * Called when inventory item quantity is updated
 * Integrates with: /api/inventory/[id]
 */
export async function onInventoryUpdated(
  item: {
    id: string;
    name: string;
    category: string;
    currentQuantity: number;
    minQuantity: number | null;
    maxQuantity: number | null;
  },
  familyId: string
): Promise<void> {
  // Only trigger if quantity is low
  if (item.minQuantity !== null && item.currentQuantity <= item.minQuantity) {
    const thresholdPercentage =
      item.maxQuantity && item.maxQuantity > 0
        ? (item.currentQuantity / item.maxQuantity) * 100
        : 0;

    await triggerRuleEvaluation('inventory_low', {
      familyId,
      inventoryItemId: item.id,
      itemName: item.name,
      category: item.category,
      currentQuantity: item.currentQuantity,
      thresholdPercentage,
      triggerId: item.id,
    });
  }
}

// ============================================
// CALENDAR EVENT ADDED HOOK
// ============================================

/**
 * Called when a calendar event is added
 * Integrates with: /api/calendar/events
 */
export async function onCalendarEventAdded(
  event: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  },
  familyId: string,
  dayEventCount: number
): Promise<void> {
  await triggerRuleEvaluation('calendar_busy', {
    familyId,
    eventId: event.id,
    eventCount: dayEventCount,
    date: event.startTime.toISOString().split('T')[0],
    triggerId: event.id,
  });
}

// ============================================
// MEDICATION GIVEN HOOK
// ============================================

/**
 * Called when a medication dose is logged
 * Integrates with: /api/medications/dose (if it exists)
 */
export async function onMedicationGiven(
  dose: {
    id: string;
    medicationId: string;
    memberId: string;
    givenAt: Date;
  },
  familyId: string
): Promise<void> {
  await triggerRuleEvaluation('medication_given', {
    familyId,
    memberId: dose.memberId,
    medicationId: dose.medicationId,
    doseId: dose.id,
    givenAt: dose.givenAt,
    triggerId: dose.id,
  });
}

// ============================================
// ROUTINE COMPLETED HOOK
// ============================================

/**
 * Called when a routine is completed
 * Integrates with: /api/routines/[id]/complete (if it exists)
 */
export async function onRoutineCompleted(
  completion: {
    id: string;
    routineId: string;
    memberId: string;
    completedAt: Date;
  },
  familyId: string,
  routineType?: string
): Promise<void> {
  await triggerRuleEvaluation('routine_completed', {
    familyId,
    memberId: completion.memberId,
    routineId: completion.routineId,
    routineType,
    completionId: completion.id,
    completedAt: completion.completedAt,
    triggerId: completion.id,
  });
}

// ============================================
// UTILITY: CHECK IF RULES ENGINE IS ENABLED
// ============================================

/**
 * Check if rules engine is enabled for a family
 * Can be used by calling code to skip hook calls if module is disabled
 */
export async function isRulesEngineEnabled(familyId: string): Promise<boolean> {
  // This would check module configuration
  // For now, return true (always enabled)
  // In production, query the ModuleConfiguration table
  return true;
}
