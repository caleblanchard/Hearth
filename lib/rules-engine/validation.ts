/**
 * Rules Engine Validation
 *
 * Validates rule configurations for triggers, actions, and conditions.
 * Ensures safety limits are respected and configurations are well-formed.
 */

import {
  TriggerConfig,
  ActionConfig,
  ActionType,
  ConditionConfig,
  ValidationResult,
  isValidTriggerType,
  isValidActionType,
  DEFAULT_SAFETY_LIMITS,
  ChoreCompletedConfig,
  ChoreStreakConfig,
  ScreenTimeLowConfig,
  InventoryLowConfig,
  CalendarBusyConfig,
  MedicationGivenConfig,
  RoutineCompletedConfig,
  TimeBasedConfig,
  AwardCreditsConfig,
  SendNotificationConfig,
  AddShoppingItemConfig,
  CreateTodoConfig,
  LockMedicationConfig,
  SuggestMealConfig,
  ReduceChoresConfig,
  AdjustScreenTimeConfig,
} from './types';

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate complete rule configuration
 */
export function validateRuleConfiguration(
  trigger: TriggerConfig,
  conditions: ConditionConfig | null,
  actions: ActionConfig[]
): ValidationResult {
  // Validate trigger
  const triggerValidation = validateTrigger(trigger);
  if (!triggerValidation.valid) {
    return triggerValidation;
  }

  // Validate conditions if present
  if (conditions) {
    const conditionsValidation = validateConditions(conditions);
    if (!conditionsValidation.valid) {
      return conditionsValidation;
    }
  }

  // Validate actions
  const actionsValidation = validateActions(actions);
  if (!actionsValidation.valid) {
    return actionsValidation;
  }

  return { valid: true };
}

// ============================================
// TRIGGER VALIDATION
// ============================================

/**
 * Validate trigger configuration
 */
export function validateTrigger(trigger: TriggerConfig): ValidationResult {
  // Check trigger type exists
  if (!trigger.type) {
    return { valid: false, error: 'Trigger type is required' };
  }

  // Check trigger type is valid
  if (!isValidTriggerType(trigger.type)) {
    return {
      valid: false,
      error: `Invalid trigger type: ${trigger.type}. Must be one of: chore_completed, chore_streak, screentime_low, inventory_low, calendar_busy, medication_given, routine_completed, time_based`,
    };
  }

  // Check config exists
  if (!trigger.config || typeof trigger.config !== 'object') {
    return { valid: false, error: 'Trigger config must be an object' };
  }

  // Validate specific trigger type configuration
  switch (trigger.type) {
    case 'chore_completed':
      return validateChoreCompletedConfig(trigger.config);
    case 'chore_streak':
      return validateChoreStreakConfig(trigger.config);
    case 'screentime_low':
      return validateScreenTimeLowConfig(trigger.config);
    case 'inventory_low':
      return validateInventoryLowConfig(trigger.config);
    case 'calendar_busy':
      return validateCalendarBusyConfig(trigger.config);
    case 'medication_given':
      return validateMedicationGivenConfig(trigger.config);
    case 'routine_completed':
      return validateRoutineCompletedConfig(trigger.config);
    case 'time_based':
      return validateTimeBasedConfig(trigger.config);
    default:
      return { valid: false, error: 'Unknown trigger type' };
  }
}

// Specific trigger validators
function validateChoreCompletedConfig(config: any): ValidationResult {
  const cfg = config as ChoreCompletedConfig;

  // At least one targeting option should be specified
  if (!cfg.choreId && !cfg.choreDefinitionId && !cfg.anyChore) {
    return {
      valid: false,
      error: 'Chore completed trigger must specify choreId, choreDefinitionId, or anyChore=true',
    };
  }

  return { valid: true };
}

function validateChoreStreakConfig(config: any): ValidationResult {
  const cfg = config as ChoreStreakConfig;

  if (!cfg.days || typeof cfg.days !== 'number') {
    return { valid: false, error: 'Chore streak trigger requires days (number)' };
  }

  if (cfg.days < 1 || cfg.days > 365) {
    return { valid: false, error: 'Streak days must be between 1 and 365' };
  }

  return { valid: true };
}

function validateScreenTimeLowConfig(config: any): ValidationResult {
  const cfg = config as ScreenTimeLowConfig;

  if (!cfg.thresholdMinutes || typeof cfg.thresholdMinutes !== 'number') {
    return { valid: false, error: 'Screen time low trigger requires thresholdMinutes (number)' };
  }

  if (cfg.thresholdMinutes < 0 || cfg.thresholdMinutes > 1440) {
    return { valid: false, error: 'Threshold minutes must be between 0 and 1440 (24 hours)' };
  }

  return { valid: true };
}

function validateInventoryLowConfig(config: any): ValidationResult {
  const cfg = config as InventoryLowConfig;

  // At least one targeting option
  if (!cfg.itemId && !cfg.category) {
    return {
      valid: false,
      error: 'Inventory low trigger must specify itemId or category',
    };
  }

  if (cfg.thresholdPercentage !== undefined) {
    if (typeof cfg.thresholdPercentage !== 'number' || cfg.thresholdPercentage < 0 || cfg.thresholdPercentage > 100) {
      return { valid: false, error: 'Threshold percentage must be between 0 and 100' };
    }
  }

  return { valid: true };
}

function validateCalendarBusyConfig(config: any): ValidationResult {
  const cfg = config as CalendarBusyConfig;

  if (!cfg.eventCount || typeof cfg.eventCount !== 'number') {
    return { valid: false, error: 'Calendar busy trigger requires eventCount (number)' };
  }

  if (cfg.eventCount < 1 || cfg.eventCount > 50) {
    return { valid: false, error: 'Event count must be between 1 and 50' };
  }

  return { valid: true };
}

function validateMedicationGivenConfig(config: any): ValidationResult {
  const cfg = config as MedicationGivenConfig;

  // At least one targeting option
  if (!cfg.medicationId && !cfg.anyMedication) {
    return {
      valid: false,
      error: 'Medication given trigger must specify medicationId or anyMedication=true',
    };
  }

  return { valid: true };
}

function validateRoutineCompletedConfig(config: any): ValidationResult {
  // Config is optional for this trigger
  return { valid: true };
}

function validateTimeBasedConfig(config: any): ValidationResult {
  const cfg = config as TimeBasedConfig;

  if (!cfg.cron || typeof cfg.cron !== 'string') {
    return { valid: false, error: 'Time based trigger requires cron expression (string)' };
  }

  // Basic cron validation (simplified - full validation would use a cron parser library)
  const specialValues = ['birthday', 'weekly', 'monthly', 'daily'];
  if (!specialValues.includes(cfg.cron)) {
    // Validate cron expression format (basic check)
    const cronParts = cfg.cron.trim().split(' ');
    if (cronParts.length !== 5) {
      return {
        valid: false,
        error: 'Cron expression must have 5 parts (minute hour day month weekday) or be a special value: birthday, weekly, monthly, daily',
      };
    }
  }

  if (!cfg.description) {
    return { valid: false, error: 'Time based trigger requires description' };
  }

  return { valid: true };
}

// ============================================
// ACTION VALIDATION
// ============================================

/**
 * Validate array of actions
 */
export function validateActions(actions: ActionConfig[]): ValidationResult {
  if (!Array.isArray(actions)) {
    return { valid: false, error: 'Actions must be an array' };
  }

  if (actions.length === 0) {
    return { valid: false, error: 'At least one action is required' };
  }

  if (actions.length > DEFAULT_SAFETY_LIMITS.maxActionsPerRule) {
    return {
      valid: false,
      error: `Maximum ${DEFAULT_SAFETY_LIMITS.maxActionsPerRule} actions allowed per rule`,
    };
  }

  // Validate each action
  for (let i = 0; i < actions.length; i++) {
    const actionValidation = validateAction(actions[i]);
    if (!actionValidation.valid) {
      return {
        valid: false,
        error: `Action ${i + 1}: ${actionValidation.error}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate single action configuration
 */
export function validateAction(action: ActionConfig): ValidationResult {
  // Check action type exists
  if (!action.type) {
    return { valid: false, error: 'Action type is required' };
  }

  // Check action type is valid
  if (!isValidActionType(action.type)) {
    return {
      valid: false,
      error: `Invalid action type: ${action.type}. Must be one of: award_credits, send_notification, add_shopping_item, create_todo, lock_medication, suggest_meal, reduce_chores, adjust_screentime`,
    };
  }

  // Check config exists
  if (!action.config || typeof action.config !== 'object') {
    return { valid: false, error: 'Action config must be an object' };
  }

  // Validate specific action type configuration
  switch (action.type) {
    case 'award_credits':
      return validateAwardCreditsConfig(action.config);
    case 'send_notification':
      return validateSendNotificationConfig(action.config);
    case 'add_shopping_item':
      return validateAddShoppingItemConfig(action.config);
    case 'create_todo':
      return validateCreateTodoConfig(action.config);
    case 'lock_medication':
      return validateLockMedicationConfig(action.config);
    case 'suggest_meal':
      return validateSuggestMealConfig(action.config);
    case 'reduce_chores':
      return validateReduceChoresConfig(action.config);
    case 'adjust_screentime':
      return validateAdjustScreenTimeConfig(action.config);
    default:
      return { valid: false, error: 'Unknown action type' };
  }
}

// Specific action validators
function validateAwardCreditsConfig(config: any): ValidationResult {
  const cfg = config as AwardCreditsConfig;

  if (!cfg.amount || typeof cfg.amount !== 'number') {
    return { valid: false, error: 'Award credits action requires amount (number)' };
  }

  if (cfg.amount < 1 || cfg.amount > DEFAULT_SAFETY_LIMITS.maxCreditsPerAction) {
    return {
      valid: false,
      error: `Credit amount must be between 1 and ${DEFAULT_SAFETY_LIMITS.maxCreditsPerAction}`,
    };
  }

  return { valid: true };
}

function validateSendNotificationConfig(config: any): ValidationResult {
  const cfg = config as SendNotificationConfig;

  if (!Array.isArray(cfg.recipients) || cfg.recipients.length === 0) {
    return { valid: false, error: 'Send notification action requires recipients array' };
  }

  if (cfg.recipients.length > DEFAULT_SAFETY_LIMITS.maxNotificationsPerExecution) {
    return {
      valid: false,
      error: `Maximum ${DEFAULT_SAFETY_LIMITS.maxNotificationsPerExecution} notification recipients allowed`,
    };
  }

  if (!cfg.title || typeof cfg.title !== 'string' || cfg.title.trim().length === 0) {
    return { valid: false, error: 'Send notification action requires title (non-empty string)' };
  }

  if (!cfg.message || typeof cfg.message !== 'string' || cfg.message.trim().length === 0) {
    return { valid: false, error: 'Send notification action requires message (non-empty string)' };
  }

  return { valid: true };
}

function validateAddShoppingItemConfig(config: any): ValidationResult {
  const cfg = config as AddShoppingItemConfig;

  if (!cfg.fromInventory && (!cfg.itemName || typeof cfg.itemName !== 'string' || cfg.itemName.trim().length === 0)) {
    return { valid: false, error: 'Add shopping item action requires itemName (non-empty string) unless fromInventory=true' };
  }

  if (cfg.quantity !== undefined && (typeof cfg.quantity !== 'number' || cfg.quantity < 1)) {
    return { valid: false, error: 'Shopping item quantity must be a positive number' };
  }

  if (cfg.priority && !['NORMAL', 'NEEDED_SOON', 'URGENT'].includes(cfg.priority)) {
    return { valid: false, error: 'Shopping item priority must be NORMAL, NEEDED_SOON, or URGENT' };
  }

  return { valid: true };
}

function validateCreateTodoConfig(config: any): ValidationResult {
  const cfg = config as CreateTodoConfig;

  if (!cfg.title || typeof cfg.title !== 'string' || cfg.title.trim().length === 0) {
    return { valid: false, error: 'Create todo action requires title (non-empty string)' };
  }

  if (cfg.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(cfg.priority)) {
    return { valid: false, error: 'Todo priority must be LOW, MEDIUM, HIGH, or URGENT' };
  }

  return { valid: true };
}

function validateLockMedicationConfig(config: any): ValidationResult {
  const cfg = config as LockMedicationConfig;

  if (!cfg.medicationId || typeof cfg.medicationId !== 'string') {
    return { valid: false, error: 'Lock medication action requires medicationId (string)' };
  }

  if (!cfg.hours || typeof cfg.hours !== 'number' || cfg.hours < 0 || cfg.hours > 72) {
    return { valid: false, error: 'Lock medication hours must be between 0 and 72' };
  }

  return { valid: true };
}

function validateSuggestMealConfig(config: any): ValidationResult {
  const cfg = config as SuggestMealConfig;

  if (cfg.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(cfg.difficulty)) {
    return { valid: false, error: 'Meal difficulty must be EASY, MEDIUM, or HARD' };
  }

  return { valid: true };
}

function validateReduceChoresConfig(config: any): ValidationResult {
  const cfg = config as ReduceChoresConfig;

  if (!cfg.memberId || typeof cfg.memberId !== 'string') {
    return { valid: false, error: 'Reduce chores action requires memberId (string)' };
  }

  if (!cfg.percentage || typeof cfg.percentage !== 'number' || cfg.percentage < 1 || cfg.percentage > 100) {
    return { valid: false, error: 'Reduce chores percentage must be between 1 and 100' };
  }

  if (!cfg.duration || typeof cfg.duration !== 'number' || cfg.duration < 1 || cfg.duration > 30) {
    return { valid: false, error: 'Reduce chores duration must be between 1 and 30 days' };
  }

  return { valid: true };
}

function validateAdjustScreenTimeConfig(config: any): ValidationResult {
  const cfg = config as AdjustScreenTimeConfig;

  if (!cfg.memberId || typeof cfg.memberId !== 'string') {
    return { valid: false, error: 'Adjust screen time action requires memberId (string)' };
  }

  if (cfg.amountMinutes === undefined || typeof cfg.amountMinutes !== 'number') {
    return { valid: false, error: 'Adjust screen time action requires amountMinutes (number)' };
  }

  if (cfg.amountMinutes < -1440 || cfg.amountMinutes > 1440) {
    return { valid: false, error: 'Screen time adjustment must be between -1440 and 1440 minutes (±24 hours)' };
  }

  return { valid: true };
}

// ============================================
// CONDITION VALIDATION
// ============================================

/**
 * Validate condition configuration
 */
export function validateConditions(conditions: ConditionConfig): ValidationResult {
  if (!conditions.operator || !['AND', 'OR'].includes(conditions.operator)) {
    return { valid: false, error: 'Conditions operator must be AND or OR' };
  }

  if (!Array.isArray(conditions.rules) || conditions.rules.length === 0) {
    return { valid: false, error: 'Conditions must have at least one rule' };
  }

  if (conditions.rules.length > DEFAULT_SAFETY_LIMITS.maxConditionsPerRule) {
    return {
      valid: false,
      error: `Maximum ${DEFAULT_SAFETY_LIMITS.maxConditionsPerRule} condition rules allowed`,
    };
  }

  // Validate each condition rule
  for (let i = 0; i < conditions.rules.length; i++) {
    const rule = conditions.rules[i];

    if (!rule.field || typeof rule.field !== 'string') {
      return { valid: false, error: `Condition rule ${i + 1}: field is required (string)` };
    }

    const validOperators = ['equals', 'gt', 'lt', 'gte', 'lte', 'contains'];
    if (!rule.operator || !validOperators.includes(rule.operator)) {
      return {
        valid: false,
        error: `Condition rule ${i + 1}: operator must be one of: ${validOperators.join(', ')}`,
      };
    }

    if (rule.value === undefined) {
      return { valid: false, error: `Condition rule ${i + 1}: value is required` };
    }
  }

  return { valid: true };
}

// ============================================
// SAFETY VALIDATORS
// ============================================

/**
 * Detect potential infinite loop risks
 */
export function detectInfiniteLoopRisk(
  trigger: TriggerConfig,
  actions: ActionConfig[]
): { hasRisk: boolean; warning?: string } {
  const actionTypes = actions.map(a => a.type);

  // Define risky combinations
  const riskyPairs = [
    {
      trigger: 'chore_completed',
      action: 'reduce_chores',
      warning: 'Reducing chores when chores complete may create unexpected behavior',
    },
    {
      trigger: 'screentime_low',
      action: 'adjust_screentime',
      warning: 'Adjusting screen time when low may create a loop if adjustment is negative',
    },
    {
      trigger: 'inventory_low',
      action: 'add_shopping_item',
      warning: 'Adding shopping items for low inventory is normal, but ensure proper thresholds',
    },
  ];

  for (const pair of riskyPairs) {
    if (trigger.type === pair.trigger && actionTypes.includes(pair.action as ActionType)) {
      return { hasRisk: true, warning: pair.warning };
    }
  }

  return { hasRisk: false };
}

/**
 * Validate rule name
 */
export function validateRuleName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Rule name is required (string)' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Rule name cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Rule name must be 100 characters or less' };
  }

  return { valid: true };
}
