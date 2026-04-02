/**
 * Rules Engine Trigger Evaluators
 *
 * Functions to evaluate whether triggers should fire based on context.
 * Each trigger type has its own evaluator function.
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from '@/lib/supabase/server';
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

  // Check streak type if specified
  if (config.streakType && context.streakType !== config.streakType) {
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
  // If context provides direct values, use those (for testing)
  if (context.currentQuantity !== undefined && context.thresholdPercentage !== undefined) {
    // Check if item matches config criteria
    if (config.itemId && context.inventoryItemId !== config.itemId) {
      return false;
    }

    if (config.category && context.category !== config.category) {
      return false;
    }

    // Check threshold percentage
    const thresholdPercentage = config.thresholdPercentage || 20;
    return context.thresholdPercentage <= thresholdPercentage;
  }

  // Check if context has inventory item data
  if (!context.inventoryItemId && !context.familyId) {
    return false;
  }

  // Get inventory item
  const supabase = await createClient();
  let item;
  if (context.inventoryItemId) {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', context.inventoryItemId)
      .single();
    item = data;
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
  if (item.low_stock_threshold !== null && item.low_stock_threshold !== undefined) {
    return item.current_quantity <= item.low_stock_threshold;
  }

  // Otherwise, check if quantity is low (close to 0)
  // For items without explicit threshold, trigger if quantity < 2
  return item.current_quantity < 2;
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

  // If context provides eventCount directly, use it (for testing)
  if (context.eventCount !== undefined) {
    // Check date match if specified
    if (config.date && context.date !== config.date) {
      return false;
    }

    // Trigger fires if event count meets or exceeds threshold
    return context.eventCount >= config.eventCount;
  }

  // Determine which date to check (default to today)
  const targetDate = config.date ? new Date(config.date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count events for the day
  const supabase = await createClient();
  const { count: eventCount } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', context.familyId)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString());

  // Trigger fires if event count meets or exceeds threshold
  return (eventCount || 0) >= config.eventCount;
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
    // Still check memberId if specified
    if (config.memberId && context.memberId !== config.memberId) {
      return false;
    }
    return true;
  }

  // Check specific medicationId match
  if (config.medicationId && context.medicationId === config.medicationId) {
    // Check memberId if specified
    if (config.memberId && context.memberId !== config.memberId) {
      return false;
    }
    return true;
  }

  // If config is empty, match any medication (backward compatibility)
  if (!config.medicationId && !config.memberId && !config.anyMedication) {
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
  // If no specific routine configured, match any routine
  if (!config.routineId && !config.routineType) {
    // But still need routineId in context to know this is a routine event
    return !!context.routineId;
  }

  // Check routineType match
  if (config.routineType) {
    // First check if context has routineType directly
    if (context.routineType && context.routineType === config.routineType) {
      return true;
    }

    // Otherwise look up the routine from database (need routineId for this)
    if (context.routineId) {
      const supabase = await createClient();
      const { data: routine } = await supabase
        .from('routines')
        .select('type')
        .eq('id', context.routineId)
        .single();

      if (routine && routine.type === config.routineType) {
        return true;
      }
    }
  }

  // Check specific routineId match
  if (config.routineId && context.routineId === config.routineId) {
    return true;
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
      // If no memberId provided, can't evaluate birthday - return true
      // The cron job will provide the correct context
      return true;
    }

    const supabase = await createClient();
    const { data: member } = await supabase
      .from('family_members')
      .select('birth_date')
      .eq('id', context.memberId)
      .single();

    if (!member?.birth_date) {
      // No birthdate configured, can't evaluate
      return true;
    }

    const today = new Date(now);
    const birthDate = new Date(member.birth_date);

    return (
      today.getMonth() === birthDate.getMonth() &&
      today.getDate() === birthDate.getDate()
    );
  }

  // For actual cron expressions, return true
  // The cron job will handle the scheduling logic
  return true;
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
