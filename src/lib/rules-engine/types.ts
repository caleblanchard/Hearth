/**
 * Rules Engine Type Definitions
 *
 * Core types and interfaces for the automation rules engine.
 * Defines triggers, actions, conditions, and execution contexts.
 */

// ============================================
// TRIGGER TYPES
// ============================================

export type TriggerType =
  | 'chore_completed'      // When a chore is completed
  | 'chore_streak'         // When a chore streak milestone is reached
  | 'screentime_low'       // When screen time balance drops below threshold
  | 'inventory_low'        // When inventory item drops below threshold
  | 'calendar_busy'        // When calendar shows many events for a day
  | 'medication_given'     // When medication is administered
  | 'routine_completed'    // When a routine is finished
  | 'time_based';          // Time-based triggers (cron-like)

export interface TriggerConfig {
  type: TriggerType;
  config: Record<string, any>;
}

// Specific trigger configurations
export interface ChoreCompletedConfig {
  choreId?: string;           // Specific chore ID (optional)
  choreDefinitionId?: string; // Specific chore definition (optional)
  anyChore?: boolean;         // Match any chore completion
}

export interface ChoreStreakConfig {
  days: number;               // Streak length threshold
  streakType?: string;        // Optional: DAILY_CHORES, WEEKLY_CHORES, etc.
}

export interface ScreenTimeLowConfig {
  thresholdMinutes: number;   // Alert when balance drops below this
}

export interface InventoryLowConfig {
  itemId?: string;            // Specific item (optional)
  category?: string;          // Category of items (optional)
  thresholdPercentage?: number; // Percentage threshold (default: 20%)
}

export interface CalendarBusyConfig {
  eventCount: number;         // Number of events to trigger
  date?: string;              // Optional: specific date, default is today
}

export interface MedicationGivenConfig {
  medicationId?: string;      // Specific medication (optional)
  memberId?: string;          // Specific family member (optional)
  anyMedication?: boolean;    // Match any medication
}

export interface RoutineCompletedConfig {
  routineId?: string;         // Specific routine (optional)
  routineType?: string;       // MORNING, BEDTIME, etc. (optional)
}

export interface TimeBasedConfig {
  cron: string;               // Cron expression or special value like 'birthday'
  description: string;        // Human-readable description
}

// ============================================
// ACTION TYPES
// ============================================

export type ActionType =
  | 'award_credits'        // Award credits to a family member
  | 'send_notification'    // Send push notification
  | 'add_shopping_item'    // Add item to shopping list
  | 'create_todo'          // Create a todo item
  | 'lock_medication'      // Activate medication safety timer
  | 'suggest_meal'         // Suggest meals based on criteria
  | 'reduce_chores'        // Temporarily reduce chore load
  | 'adjust_screentime';   // Modify screen time allocation

export interface ActionConfig {
  type: ActionType;
  config: Record<string, any>;
}

// Specific action configurations
export interface AwardCreditsConfig {
  amount: number;             // Credit amount (max 1000 per action)
  memberId?: string;          // Target member (optional, defaults to trigger context)
  reason?: string;            // Reason for award
}

export interface SendNotificationConfig {
  recipients: string[];       // Array of member IDs or ['all', 'parents', 'child']
  title: string;              // Notification title
  message: string;            // Notification message
  actionUrl?: string;         // Optional deep link
}

export interface AddShoppingItemConfig {
  itemName: string;           // Item name
  quantity?: number;          // Default: 1
  category?: string;          // Shopping category
  priority?: 'NORMAL' | 'NEEDED_SOON' | 'URGENT';
  fromInventory?: boolean;    // Auto-populate from low inventory item
  notes?: string;             // Optional notes for the shopping item
}

export interface CreateTodoConfig {
  title: string;              // Todo title
  description?: string;       // Todo description
  assignedToId?: string;      // Assignee (optional)
  dueDate?: string;           // ISO date string (optional)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;          // Todo category
}

export interface LockMedicationConfig {
  medicationId: string;       // Medication to lock
  hours: number;              // Lock duration in hours
}

export interface SuggestMealConfig {
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  category?: string;          // BREAKFAST, LUNCH, DINNER, etc.
}

export interface ReduceChoresConfig {
  memberId: string;           // Target member
  percentage: number;         // Percentage reduction (e.g., 50 for half)
  duration: number;           // Duration in days
}

export interface AdjustScreenTimeConfig {
  memberId: string;           // Target member
  amountMinutes: number;      // Positive to add, negative to subtract
  reason?: string;            // Reason for adjustment
}

// ============================================
// CONDITION TYPES
// ============================================

export interface ConditionConfig {
  operator: 'AND' | 'OR';     // Logical operator for combining rules
  rules: ConditionRule[];     // Array of condition rules
}

export interface ConditionRule {
  field: string;              // Field to check (from context)
  operator: 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;                 // Value to compare against
}

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface RuleContext {
  // Core identifiers
  triggerId?: string;         // ID of the trigger event
  ruleId?: string;            // ID of the rule being evaluated
  familyId: string;           // Family ID (required)
  memberId?: string;          // Member ID (if applicable)

  // Trigger-specific data
  choreInstanceId?: string;   // For chore triggers
  choreDefinitionId?: string; // For chore triggers
  currentStreak?: number;     // For streak triggers
  currentBalance?: number;    // For screen time triggers
  inventoryItemId?: string;   // For inventory triggers
  eventCount?: number;        // For calendar triggers
  medicationId?: string;      // For medication triggers
  routineId?: string;         // For routine triggers
  timestamp?: Date;           // For time-based triggers

  // Additional context
  [key: string]: any;         // Allow any additional properties
}

// ============================================
// EXECUTION RESULTS
// ============================================

export interface ActionResult {
  success: boolean;           // Whether action executed successfully
  error?: string;             // Error message if failed
  result?: Record<string, any>; // Action-specific result data
}

export interface RuleExecutionResult {
  ruleId: string;             // Rule that was executed
  ruleName: string;           // Rule name for logging
  success: boolean;           // Overall success
  triggerMatched: boolean;    // Whether trigger matched
  conditionsMatched: boolean; // Whether conditions matched
  actionsCompleted: number;   // Number of successful actions
  actionsFailed: number;      // Number of failed actions
  actionResults: ActionResult[]; // Individual action results
  errors: string[];           // Array of error messages
  executedAt: Date;           // Execution timestamp
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;             // Whether validation passed
  error?: string;             // Error message if validation failed
  errors?: string[];          // Multiple error messages
}

export interface DryRunResult {
  wouldExecute: boolean;      // Would the rule execute?
  triggerEvaluated: boolean;  // Trigger evaluation result
  conditionsEvaluated: boolean; // Conditions evaluation result
  actions: Array<{
    type: ActionType;
    wouldExecute: boolean;
    simulation: string;       // Description of what would happen
  }>;
  errors: string[];           // Any validation or evaluation errors
  warnings: string[];         // Warnings (e.g., infinite loop risk)
}

// ============================================
// RULE TEMPLATE TYPES
// ============================================

export interface RuleTemplate {
  id: string;                 // Unique template identifier
  name: string;               // Display name
  description: string;        // User-friendly description
  category: 'productivity' | 'safety' | 'rewards' | 'convenience';
  trigger: TriggerConfig;     // Pre-configured trigger
  conditions?: ConditionConfig; // Optional conditions
  actions: ActionConfig[];    // Pre-configured actions
  customizable: string[];     // Fields user can customize (dot notation)
}

// ============================================
// SAFETY & LIMITS
// ============================================

export interface SafetyLimits {
  maxExecutionsPerHour: number;      // Default: 10
  maxActionsPerRule: number;         // Default: 5
  maxConditionsPerRule: number;     // Default: 10
  maxCreditsPerAction: number;       // Default: 1000
  maxNotificationsPerExecution: number; // Default: 10
  maxConsecutiveFailures: number;    // Default: 3 (auto-disable)
}

export const DEFAULT_SAFETY_LIMITS: SafetyLimits = {
  maxExecutionsPerHour: 10,
  maxActionsPerRule: 5,
  maxConditionsPerRule: 10,
  maxCreditsPerAction: 1000,
  maxNotificationsPerExecution: 10,
  maxConsecutiveFailures: 3,
};

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Type guard to check if a string is a valid TriggerType
 */
export function isValidTriggerType(type: string): type is TriggerType {
  const validTypes: TriggerType[] = [
    'chore_completed',
    'chore_streak',
    'screentime_low',
    'inventory_low',
    'calendar_busy',
    'medication_given',
    'routine_completed',
    'time_based',
  ];
  return validTypes.includes(type as TriggerType);
}

/**
 * Type guard to check if a string is a valid ActionType
 */
export function isValidActionType(type: string): type is ActionType {
  const validTypes: ActionType[] = [
    'award_credits',
    'send_notification',
    'add_shopping_item',
    'create_todo',
    'lock_medication',
    'suggest_meal',
    'reduce_chores',
    'adjust_screentime',
  ];
  return validTypes.includes(type as ActionType);
}
