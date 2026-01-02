/**
 * Rules Engine Trigger Evaluators
 *
 * Functions to evaluate whether triggers should fire based on context.
 * Each trigger type has its own evaluator function.
 */

import prisma from '@/lib/prisma';
import {
  RuleContext,
  ChoreCompletedConfig,
  ChoreStreakConfig,
  ScreenTimeLowConfig,
  InventoryLowConfig,
  CalendarBusyConfig,
  MedicationGivenConfig,
  RoutineCompletedConfig,
  TimeBasedConfig,
} from './types';

// ============================================
// CHORE COMPLETED TRIGGER
// ============================================

/**
 * Evaluate if chore completed trigger should fire
 */
export async function evaluateChoreCompletedTrigger(
  config: ChoreCompletedConfig,
  context: RuleContext
): Promise<boolean> {
  // If anyChore is true, trigger fires for any chore (if we have chore data)
  if (config.anyChore) {
    return !!(context.choreInstanceId || context.choreDefinitionId);
  }

  // Check specific choreId match
  if (config.choreId && context.choreInstanceId === config.choreId) {
    return true;
  }

  // Check choreDefinitionId match
  if (config.choreDefinitionId && context.choreDefinitionId === config.choreDefinitionId) {
    return true;
  }

  // If config is empty, match any chore (backward compatibility)
  if (!config.choreId && !config.choreDefinitionId) {
    return !!(context.choreInstanceId || context.choreDefinitionId);
  }

  return false;
}

// ============================================
// CHORE STREAK TRIGGER
// ============================================

/**
 * Evaluate if chore streak trigger should fire
 */
export async function evaluateChoreStreakTrigger(
  config: ChoreStreakConfig,
  context: RuleContext
): Promise<boolean> {
  // Check if context has streak data
  if (!context.currentStreak || !context.memberId) {
    return false;
  }

  // Trigger fires if current streak matches or exceeds the threshold
  return context.currentStreak >= config.days;
}

// ============================================
// SCREEN TIME LOW TRIGGER
// ============================================

/**
 * Evaluate if screen time low trigger should fire
 */
export async function evaluateScreenTimeLowTrigger(
  config: ScreenTimeLowConfig,
  context: RuleContext
): Promise<boolean> {
  // Check if context has screen time balance
  if (context.currentBalance === undefined || !context.memberId) {
    return false;
  }

  // Trigger fires if balance drops below or equals threshold
  return context.currentBalance <= config.thresholdMinutes;
}

// ============================================
// INVENTORY LOW TRIGGER
// ============================================

/**
 * Evaluate if inventory low trigger should fire
 */
export async function evaluateInventoryLowTrigger(
  config: InventoryLowConfig,
  context: RuleContext
): Promise<boolean> {
  // Check if context has inventory item data
  if (!context.inventoryItemId && !context.familyId) {
    return false;
  }

  // Get inventory item
  let item;
  if (context.inventoryItemId) {
    item = await prisma.inventoryItem.findUnique({
      where: { id: context.inventoryItemId },
    });
  }

  if (!item) {
    return false;
  }

  // Check if item matches config criteria
  if (config.itemId && item.id !== config.itemId) {
    return false;
  }

  if (config.category && item.category !== config.category) {
    return false;
  }

  // Calculate if item is low
  const thresholdPercentage = config.thresholdPercentage || 20;

  // If item has low stock threshold set, use that
  if (item.lowStockThreshold !== null && item.lowStockThreshold !== undefined) {
    return item.currentQuantity <= item.lowStockThreshold;
  }

  // Otherwise, check if quantity is low (close to 0)
  // For items without explicit threshold, trigger if quantity < 2
  return item.currentQuantity < 2;
}

// ============================================
// CALENDAR BUSY DAY TRIGGER
// ============================================

/**
 * Evaluate if calendar busy day trigger should fire
 */
export async function evaluateCalendarBusyTrigger(
  config: CalendarBusyConfig,
  context: RuleContext
): Promise<boolean> {
  if (!context.familyId) {
    return false;
  }

  // Determine which date to check (default to today)
  const targetDate = config.date ? new Date(config.date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count events for the day
  const eventCount = await prisma.calendarEvent.count({
    where: {
      familyId: context.familyId,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Trigger fires if event count meets or exceeds threshold
  return eventCount >= config.eventCount;
}

// ============================================
// MEDICATION GIVEN TRIGGER
// ============================================

/**
 * Evaluate if medication given trigger should fire
 */
export async function evaluateMedicationGivenTrigger(
  config: MedicationGivenConfig,
  context: RuleContext
): Promise<boolean> {
  // Check if context has medication data
  if (!context.medicationId) {
    return false;
  }

  // If anyMedication is true, trigger fires for any medication
  if (config.anyMedication) {
    return true;
  }

  // Check specific medicationId match
  if (config.medicationId && context.medicationId === config.medicationId) {
    return true;
  }

  return false;
}

// ============================================
// ROUTINE COMPLETED TRIGGER
// ============================================

/**
 * Evaluate if routine completed trigger should fire
 */
export async function evaluateRoutineCompletedTrigger(
  config: RoutineCompletedConfig,
  context: RuleContext
): Promise<boolean> {
  // Check if context has routine completion data
  if (!context.routineId) {
    return false;
  }

  // If no specific routine configured, match any routine
  if (!config.routineId && !config.routineType) {
    return true;
  }

  // Check specific routineId match
  if (config.routineId && context.routineId === config.routineId) {
    return true;
  }

  // Check routineType match
  if (config.routineType) {
    const routine = await prisma.routine.findUnique({
      where: { id: context.routineId },
      select: { type: true },
    });

    if (routine && routine.type === config.routineType) {
      return true;
    }
  }

  return false;
}

// ============================================
// TIME BASED TRIGGER
// ============================================

/**
 * Evaluate if time based trigger should fire
 * Note: This is typically called from a cron job evaluator
 */
export async function evaluateTimeBasedTrigger(
  config: TimeBasedConfig,
  context: RuleContext
): Promise<boolean> {
  // For time-based triggers, the evaluation is done externally
  // by the cron job that checks if current time matches the cron expression
  // This function is mainly used for dry-run testing

  const now = context.timestamp || new Date();

  // Handle special cron values
  if (config.cron === 'birthday') {
    // Check if today is the member's birthday
    if (!context.memberId) {
      return false;
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: context.memberId },
      select: { birthDate: true },
    });

    if (!member?.birthDate) {
      return false;
    }

    const today = new Date(now);
    const birthDate = new Date(member.birthDate);

    return (
      today.getMonth() === birthDate.getMonth() &&
      today.getDate() === birthDate.getDate()
    );
  }

  // For actual cron expressions, return true if explicitly triggered
  // The cron job will handle the scheduling logic
  return context.triggerId === 'time_based_cron';
}

// ============================================
// MAIN TRIGGER EVALUATOR
// ============================================

/**
 * Evaluate any trigger type based on config and context
 */
export async function evaluateTrigger(
  triggerType: string,
  triggerConfig: any,
  context: RuleContext
): Promise<boolean> {
  try {
    switch (triggerType) {
      case 'chore_completed':
        return await evaluateChoreCompletedTrigger(triggerConfig, context);

      case 'chore_streak':
        return await evaluateChoreStreakTrigger(triggerConfig, context);

      case 'screentime_low':
        return await evaluateScreenTimeLowTrigger(triggerConfig, context);

      case 'inventory_low':
        return await evaluateInventoryLowTrigger(triggerConfig, context);

      case 'calendar_busy':
        return await evaluateCalendarBusyTrigger(triggerConfig, context);

      case 'medication_given':
        return await evaluateMedicationGivenTrigger(triggerConfig, context);

      case 'routine_completed':
        return await evaluateRoutineCompletedTrigger(triggerConfig, context);

      case 'time_based':
        return await evaluateTimeBasedTrigger(triggerConfig, context);

      default:
        console.error(`Unknown trigger type: ${triggerType}`);
        return false;
    }
  } catch (error) {
    console.error(`Error evaluating trigger ${triggerType}:`, error);
    return false;
  }
}
