/**
 * Unit Tests: Rules Engine Condition Evaluation
 *
 * Tests for evaluating condition logic (AND/OR operators, comparisons)
 * Total: 24 tests
 */

import { evaluateConditions } from '@/lib/rules-engine/index';
import type { ConditionConfig, RuleContext } from '@/lib/rules-engine/types';

describe('Rules Engine Condition Evaluation', () => {
  // ============================================
  // NULL/EMPTY CONDITIONS (2 tests)
  // ============================================

  describe('Null/Empty Conditions', () => {
    it('should return true for null conditions', async () => {
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
      };

      const result = await evaluateConditions(null, context);

      expect(result).toBe(true);
    });

    it('should return true for undefined conditions', async () => {
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateConditions(undefined as any, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // EQUALS OPERATOR (4 tests)
  // ============================================

  describe('Equals Operator', () => {
    it('should evaluate equals with matching values', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'streak', operator: 'equals', value: 7 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        streak: 7,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should evaluate equals with non-matching values', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'credits', operator: 'equals', value: 100 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        credits: 50,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should handle string equality', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'category', operator: 'equals', value: 'FOOD_PANTRY' },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        category: 'FOOD_PANTRY',
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should handle boolean equality', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'isActive', operator: 'equals', value: true },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        isActive: true,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // COMPARISON OPERATORS (6 tests)
  // ============================================

  describe('Comparison Operators', () => {
    it('should evaluate greater than (gt)', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'credits', operator: 'gt', value: 50 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        credits: 75,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should evaluate less than (lt)', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'screentime', operator: 'lt', value: 60 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        screentime: 30,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should evaluate greater than or equal (gte)', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'streak', operator: 'gte', value: 7 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        streak: 7,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should evaluate less than or equal (lte)', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'quantity', operator: 'lte', value: 10 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        quantity: 5,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should fail gt when values are equal', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'value', operator: 'gt', value: 50 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        value: 50,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should fail lt when values are equal', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'value', operator: 'lt', value: 50 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        value: 50,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // CONTAINS OPERATOR (2 tests)
  // ============================================

  describe('Contains Operator', () => {
    it('should evaluate contains for strings', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'message', operator: 'contains', value: 'important' },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        message: 'This is an important message',
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should fail contains when substring not found', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'title', operator: 'contains', value: 'urgent' },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        title: 'Normal message',
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // AND OPERATOR (4 tests)
  // ============================================

  describe('AND Operator', () => {
    it('should return true when all AND conditions match', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'streak', operator: 'gte', value: 7 },
          { field: 'credits', operator: 'lt', value: 100 },
          { field: 'isActive', operator: 'equals', value: true },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        streak: 10,
        credits: 50,
        isActive: true,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should return false when any AND condition fails', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'streak', operator: 'gte', value: 7 },
          { field: 'credits', operator: 'lt', value: 100 }, // This will fail
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        streak: 10,
        credits: 150, // Greater than 100
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should handle single AND condition', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'value', operator: 'equals', value: 42 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        value: 42,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should return false when all AND conditions fail', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'a', operator: 'equals', value: 1 },
          { field: 'b', operator: 'equals', value: 2 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        a: 10,
        b: 20,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // OR OPERATOR (4 tests)
  // ============================================

  describe('OR Operator', () => {
    it('should return true when any OR condition matches', async () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'dayOfWeek', operator: 'equals', value: 0 }, // Sunday
          { field: 'dayOfWeek', operator: 'equals', value: 6 }, // Saturday
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        dayOfWeek: 0, // Sunday
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should return true when all OR conditions match', async () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'priority', operator: 'equals', value: 'HIGH' },
          { field: 'urgent', operator: 'equals', value: true },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        priority: 'HIGH',
        urgent: true,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should return false when all OR conditions fail', async () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'category', operator: 'equals', value: 'FOOD' },
          { field: 'category', operator: 'equals', value: 'MEDICINE' },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        category: 'CLEANING',
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should handle single OR condition', async () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'enabled', operator: 'equals', value: true },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        enabled: true,
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // MISSING FIELD HANDLING (2 tests)
  // ============================================

  describe('Missing Field Handling', () => {
    it('should return false when required field is missing', async () => {
      const conditions: ConditionConfig = {
        operator: 'AND',
        rules: [
          { field: 'nonExistentField', operator: 'equals', value: 100 },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should handle undefined values gracefully', async () => {
      const conditions: ConditionConfig = {
        operator: 'OR',
        rules: [
          { field: 'optional', operator: 'equals', value: null },
        ],
      };

      const context: RuleContext = {
        familyId: 'family-1',
        optional: undefined,
      };

      const result = await evaluateConditions(conditions, context);

      // undefined !== null, so this should be false
      expect(result).toBe(false);
    });
  });
});
