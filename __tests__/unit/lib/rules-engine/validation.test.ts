/**
 * Unit Tests: Rules Engine Validation
 *
 * Tests for rule configuration validation
 * Total: 32 tests
 */

import { validateRuleConfiguration } from '@/lib/rules-engine/validation';
import type { TriggerConfig, ActionConfig, ConditionConfig } from '@/lib/rules-engine/types';

describe('Rules Engine Validation', () => {
  // ============================================
  // TRIGGER VALIDATION (8 tests)
  // ============================================

  describe('Trigger Validation', () => {
    it('should accept valid chore_completed trigger', () => {
      const trigger: TriggerConfig = {
        type: 'chore_completed',
        config: { choreDefinitionId: 'chore-1' },
      };

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'send_notification', config: { recipients: ['member-1'], title: 'Test', message: 'Test' } },
      ]);

      expect(result.valid).toBe(true);
    });

    it('should accept valid time_based trigger with cron', () => {
      const trigger: TriggerConfig = {
        type: 'time_based',
        config: { cron: '0 9 * * *', description: 'Daily at 9 AM' },
      };

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'award_credits', config: { amount: 10 } },
      ]);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid trigger type', () => {
      const trigger = {
        type: 'invalid_trigger',
        config: {},
      } as any;

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'send_notification', config: { recipients: ['member-1'], title: 'Test', message: 'Test' } },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid trigger type');
    });

    it('should reject trigger without type', () => {
      const trigger = {
        config: {},
      } as any;

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'award_credits', config: { amount: 10 } },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Trigger type is required');
    });

    it('should reject trigger without config', () => {
      const trigger = {
        type: 'chore_completed',
      } as any;

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'award_credits', config: { amount: 10 } },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Trigger config must be an object');
    });

    it('should accept all valid trigger types', () => {
      const validTriggers: Array<{ type: string; config: any }> = [
        { type: 'chore_completed', config: { anyChore: true } },
        { type: 'chore_streak', config: { days: 7 } },
        { type: 'screentime_low', config: { thresholdMinutes: 30 } },
        { type: 'inventory_low', config: { category: 'FOOD_PANTRY', thresholdPercentage: 20 } },
        { type: 'calendar_busy', config: { eventCount: 3 } },
        { type: 'medication_given', config: { anyMedication: true } },
        { type: 'routine_completed', config: { routineType: 'MORNING' } },
        { type: 'time_based', config: { cron: '0 9 * * *', description: 'Daily at 9 AM' } },
      ];

      validTriggers.forEach(({ type, config }) => {
        const trigger: TriggerConfig = { type: type as any, config };
        const result = validateRuleConfiguration(trigger, null, [
          { type: 'send_notification', config: { recipients: ['member-1'], title: 'Test', message: 'Test' } },
        ]);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate chore_streak trigger config', () => {
      const trigger: TriggerConfig = {
        type: 'chore_streak',
        config: { days: 7 },
      };

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'award_credits', config: { amount: 10 } },
      ]);

      expect(result.valid).toBe(true);
    });

    it('should validate screentime_low trigger config', () => {
      const trigger: TriggerConfig = {
        type: 'screentime_low',
        config: { thresholdMinutes: 30 },
      };

      const result = validateRuleConfiguration(trigger, null, [
        { type: 'send_notification', config: { recipients: ['member-1'], title: 'Low Screen Time', message: 'Running low' } },
      ]);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // ACTION VALIDATION (12 tests)
  // ============================================

  describe('Action Validation', () => {
    const validTrigger: TriggerConfig = {
      type: 'chore_completed',
      config: { anyChore: true },
    };

    it('should accept valid award_credits action', () => {
      const actions: ActionConfig[] = [
        { type: 'award_credits', config: { amount: 10 } },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should accept valid send_notification action', () => {
      const actions: ActionConfig[] = [
        {
          type: 'send_notification',
          config: {
            recipients: ['member-1'],
            title: 'Test',
            message: 'Test message',
          },
        },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should accept multiple actions', () => {
      const actions: ActionConfig[] = [
        { type: 'award_credits', config: { amount: 10 } },
        { type: 'send_notification', config: { recipients: ['member-1'], title: 'Test', message: 'Test' } },
        { type: 'create_todo', config: { title: 'Test Todo' } },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should reject empty actions array', () => {
      const result = validateRuleConfiguration(validTrigger, null, []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one action is required');
    });

    it('should reject invalid action type', () => {
      const actions = [
        { type: 'invalid_action', config: {} },
      ] as any;

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid action type');
    });

    it('should reject action without type', () => {
      const actions = [
        { config: {} },
      ] as any;

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action type is required');
    });

    it('should reject action without config', () => {
      const actions = [
        { type: 'award_credits' },
      ] as any;

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action config must be an object');
    });

    it('should accept all valid action types', () => {
      const actionConfigs: { type: string; config: any }[] = [
        { type: 'award_credits', config: { amount: 10 } },
        { type: 'send_notification', config: { recipients: ['member-1'], title: 'Test', message: 'Test' } },
        { type: 'add_shopping_item', config: { itemName: 'Test Item' } },
        { type: 'create_todo', config: { title: 'Test Todo' } },
        { type: 'lock_medication', config: { medicationId: 'med-1', hours: 4 } },
        { type: 'suggest_meal', config: {} },
        { type: 'reduce_chores', config: { memberId: 'member-1', percentage: 20, duration: 7 } },
        { type: 'adjust_screentime', config: { memberId: 'member-1', amountMinutes: 30 } },
      ];

      actionConfigs.forEach(({ type, config }) => {
        const actions: ActionConfig[] = [{ type: type as any, config }];
        const result = validateRuleConfiguration(validTrigger, null, actions);
        expect(result.valid).toBe(true);
      });
    });

    it('should enforce maximum actions limit', () => {
      const actions: ActionConfig[] = Array(6).fill({
        type: 'send_notification',
        config: { recipients: ['member-1'], title: 'Test', message: 'Test' },
      });

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 5 actions allowed per rule');
    });

    it('should validate award_credits amount', () => {
      const actions: ActionConfig[] = [
        { type: 'award_credits', config: { amount: 10, reason: 'Good job!' } },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should validate send_notification recipients', () => {
      const actions: ActionConfig[] = [
        {
          type: 'send_notification',
          config: {
            recipients: ['member-1', 'member-2'],
            title: 'Alert',
            message: 'Important message',
          },
        },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should validate create_todo config', () => {
      const actions: ActionConfig[] = [
        {
          type: 'create_todo',
          config: {
            title: 'Buy groceries',
            description: 'Get milk and eggs',
            priority: 'HIGH',
          },
        },
      ];

      const result = validateRuleConfiguration(validTrigger, null, actions);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // CONDITION VALIDATION (8 tests)
  // ============================================

  describe('Condition Validation', () => {
    const validTrigger: TriggerConfig = {
      type: 'chore_completed',
      config: { anyChore: true },
    };

    const validActions: ActionConfig[] = [
      { type: 'award_credits', config: { amount: 10 } },
    ];

    it('should accept null conditions', () => {
      const result = validateRuleConfiguration(validTrigger, null, validActions);

      expect(result.valid).toBe(true);
    });

    it('should accept valid AND conditions', () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'streak', operator: 'gte', value: 7 },
          { field: 'credits', operator: 'lt', value: 100 },
        ],
      };

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(true);
    });

    it('should accept valid OR conditions', () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'dayOfWeek', operator: 'equals', value: 0 },
          { field: 'dayOfWeek', operator: 'equals', value: 6 },
        ],
      };

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid condition operator', () => {
      const conditions = {
        operator: 'INVALID',
        rules: [],
      } as any;

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Conditions operator must be AND or OR');
    });

    it('should reject empty condition rules', () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [],
      };

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Conditions must have at least one rule');
    });

    it('should accept all valid comparison operators', () => {
      const operators = ['equals', 'gt', 'lt', 'gte', 'lte', 'contains'];

      operators.forEach((op) => {
        const conditions: ConditionConfig = {
          operator: 'AND',
          rules: [{ field: 'test', operator: op as any, value: 10 }],
        };

        const result = validateRuleConfiguration(validTrigger, conditions, validActions);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid comparison operator', () => {
      const conditions = {
        operator: 'AND',
        rules: [{ field: 'test', operator: 'invalid', value: 10 }],
      } as any;

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('operator must be one of: equals, gt, lt, gte, lte, contains');
    });

    it('should enforce maximum conditions limit', () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: Array(11).fill({ field: 'test', operator: 'equals', value: 1 }),
      };

      const result = validateRuleConfiguration(validTrigger, conditions, validActions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 10 condition rules allowed');
    });
  });

  // ============================================
  // COMPLETE RULE VALIDATION (4 tests)
  // ============================================

  describe('Complete Rule Validation', () => {
    it('should accept complete valid rule with all components', () => {
      const trigger: TriggerConfig = {
        type: 'chore_streak',
        config: { days: 7 },
      };

      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'credits', operator: 'lt', value: 100 },
        ],
      };

      const actions: ActionConfig[] = [
        { type: 'award_credits', config: { amount: 10, reason: 'Streak bonus!' } },
        { type: 'send_notification', config: { recipients: ['member'], title: 'Bonus!', message: 'You earned a bonus!' } },
      ];

      const result = validateRuleConfiguration(trigger, conditions, actions);

      expect(result.valid).toBe(true);
    });

    it('should accept valid rule without conditions', () => {
      const trigger: TriggerConfig = {
        type: 'medication_given',
        config: { medicationId: 'med-1' },
      };

      const actions: ActionConfig[] = [
        { type: 'lock_medication', config: { medicationId: 'med-1', hours: 6 } },
      ];

      const result = validateRuleConfiguration(trigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should validate complex multi-action rule', () => {
      const trigger: TriggerConfig = {
        type: 'inventory_low',
        config: { category: 'FOOD_PANTRY', thresholdPercentage: 20 },
      };

      const actions: ActionConfig[] = [
        { type: 'add_shopping_item', config: { fromInventory: true, priority: 'NEEDED_SOON' } },
        {
          type: 'send_notification',
          config: {
            recipients: ['parent'],
            title: 'Low Inventory',
            message: 'Pantry items are running low',
          },
        },
      ];

      const result = validateRuleConfiguration(trigger, null, actions);

      expect(result.valid).toBe(true);
    });

    it('should reject if any component is invalid', () => {
      const trigger = { type: 'invalid', config: {} } as any;
      const actions: ActionConfig[] = [
        { type: 'award_credits', config: { amount: 10 } },
      ];

      const result = validateRuleConfiguration(trigger, null, actions);

      expect(result.valid).toBe(false);
    });
  });
});
