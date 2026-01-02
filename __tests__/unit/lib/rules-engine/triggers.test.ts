/**
 * Unit Tests: Rules Engine Trigger Evaluators
 *
 * Tests for all 8 trigger type evaluators
 * Total: 56 tests (7 per trigger type)
 */

import {
  evaluateChoreCompletedTrigger,
  evaluateChoreStreakTrigger,
  evaluateScreenTimeLowTrigger,
  evaluateInventoryLowTrigger,
  evaluateCalendarBusyTrigger,
  evaluateMedicationGivenTrigger,
  evaluateRoutineCompletedTrigger,
  evaluateTimeBasedTrigger,
} from '@/lib/rules-engine/triggers';
import type { RuleContext } from '@/lib/rules-engine/types';

describe('Rules Engine Trigger Evaluators', () => {
  // ============================================
  // CHORE COMPLETED TRIGGER (7 tests)
  // ============================================

  describe('Chore Completed Trigger', () => {
    it('should match specific chore definition', async () => {
      const config = { choreDefinitionId: 'chore-def-1' };
      const context: RuleContext = {
        familyId: 'family-1',
        choreDefinitionId: 'chore-def-1',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different chore definition', async () => {
      const config = { choreDefinitionId: 'chore-def-1' };
      const context: RuleContext = {
        familyId: 'family-1',
        choreDefinitionId: 'chore-def-2',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match specific chore instance', async () => {
      const config = { choreId: 'instance-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        choreInstanceId: 'instance-123',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match any chore when anyChore is true', async () => {
      const config = { anyChore: true };
      const context: RuleContext = {
        familyId: 'family-1',
        choreDefinitionId: 'any-chore',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when choreDefinitionId is missing from context', async () => {
      const config = { choreDefinitionId: 'chore-def-1' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should handle empty config as match any', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
        choreDefinitionId: 'some-chore',
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should prioritize specific choreId over choreDefinitionId', async () => {
      const config = {
        choreId: 'instance-123',
        choreDefinitionId: 'chore-def-1',
      };
      const context: RuleContext = {
        familyId: 'family-1',
        choreInstanceId: 'instance-123',
        choreDefinitionId: 'chore-def-2', // Different definition
      };

      const result = await evaluateChoreCompletedTrigger(config, context);

      expect(result).toBe(true); // Matches on choreId
    });
  });

  // ============================================
  // CHORE STREAK TRIGGER (7 tests)
  // ============================================

  describe('Chore Streak Trigger', () => {
    it('should match when streak equals required days', async () => {
      const config = { days: 7 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 7,
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match when streak exceeds required days', async () => {
      const config = { days: 7 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 10,
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when streak is below required days', async () => {
      const config = { days: 7 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 5,
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match specific streak type', async () => {
      const config = { days: 3, streakType: 'DAILY_CHORES' };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 5,
        streakType: 'DAILY_CHORES',
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different streak type', async () => {
      const config = { days: 3, streakType: 'DAILY_CHORES' };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 5,
        streakType: 'WEEKLY_CHORES',
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should handle missing currentStreak gracefully', async () => {
      const config = { days: 7 };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match streak of 1 day', async () => {
      const config = { days: 1 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentStreak: 1,
      };

      const result = await evaluateChoreStreakTrigger(config, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // SCREEN TIME LOW TRIGGER (7 tests)
  // ============================================

  describe('Screen Time Low Trigger', () => {
    it('should match when balance equals threshold', async () => {
      const config = { thresholdMinutes: 30 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        memberId: 'member-1',
        currentBalance: 30,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match when balance is below threshold', async () => {
      const config = { thresholdMinutes: 30 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentBalance: 15,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when balance is above threshold', async () => {
      const config = { thresholdMinutes: 30 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentBalance: 45,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match zero balance', async () => {
      const config = { thresholdMinutes: 10 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentBalance: 0,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle missing currentBalance', async () => {
      const config = { thresholdMinutes: 30 };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should work with high thresholds', async () => {
      const config = { thresholdMinutes: 120 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentBalance: 100,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when balance is just above threshold', async () => {
      const config = { thresholdMinutes: 30 };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
        currentBalance: 31,
      };

      const result = await evaluateScreenTimeLowTrigger(config, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // INVENTORY LOW TRIGGER (7 tests)
  // ============================================

  describe('Inventory Low Trigger', () => {
    it('should match specific item ID when low', async () => {
      const config = { itemId: 'item-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        inventoryItemId: 'item-123',
        currentQuantity: 2,
        thresholdPercentage: 10,
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match category when low', async () => {
      const config = { category: 'FOOD_PANTRY' };
      const context: RuleContext = {
        familyId: 'family-1',
        category: 'FOOD_PANTRY',
        currentQuantity: 1,
        thresholdPercentage: 5,
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match when below threshold percentage', async () => {
      const config = { thresholdPercentage: 20 };
      const context: RuleContext = {
        familyId: 'family-1',
        currentQuantity: 3,
        thresholdPercentage: 15, // Below 20%
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when above threshold percentage', async () => {
      const config = { thresholdPercentage: 20 };
      const context: RuleContext = {
        familyId: 'family-1',
        currentQuantity: 10,
        thresholdPercentage: 50, // Above 20%
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should not match different item ID', async () => {
      const config = { itemId: 'item-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        inventoryItemId: 'item-456',
        currentQuantity: 1,
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should not match different category', async () => {
      const config = { category: 'FOOD_PANTRY' };
      const context: RuleContext = {
        familyId: 'family-1',
        category: 'CLEANING',
        currentQuantity: 1,
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match any low inventory when no filters', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
        inventoryItemId: 'any-item',
        currentQuantity: 2,
        thresholdPercentage: 10,
      };

      const result = await evaluateInventoryLowTrigger(config, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // CALENDAR BUSY TRIGGER (7 tests)
  // ============================================

  describe('Calendar Busy Trigger', () => {
    it('should match when event count equals threshold', async () => {
      const config = { eventCount: 3 };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 3,
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match when event count exceeds threshold', async () => {
      const config = { eventCount: 3 };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 5,
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match when event count is below threshold', async () => {
      const config = { eventCount: 3 };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 2,
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match specific date', async () => {
      const config = { eventCount: 3, date: '2024-01-15' };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 4,
        date: '2024-01-15',
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different date', async () => {
      const config = { eventCount: 3, date: '2024-01-15' };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 4,
        date: '2024-01-16',
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should handle missing eventCount', async () => {
      const config = { eventCount: 3 };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match high event counts', async () => {
      const config = { eventCount: 10 };
      const context: RuleContext = {
        familyId: 'family-1',
        eventCount: 15,
      };

      const result = await evaluateCalendarBusyTrigger(config, context);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // MEDICATION GIVEN TRIGGER (7 tests)
  // ============================================

  describe('Medication Given Trigger', () => {
    it('should match specific medication ID', async () => {
      const config = { medicationId: 'med-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'med-123',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different medication ID', async () => {
      const config = { medicationId: 'med-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'med-456',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match any medication when anyMedication is true', async () => {
      const config = { anyMedication: true };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'any-med',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should match specific member', async () => {
      const config = { medicationId: 'med-123', memberId: 'member-1' };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'med-123',
        memberId: 'member-1',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different member', async () => {
      const config = { medicationId: 'med-123', memberId: 'member-1' };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'med-123',
        memberId: 'member-2',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should handle empty config as match any', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'some-med',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle missing medicationId in context', async () => {
      const config = { medicationId: 'med-123' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateMedicationGivenTrigger(config, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // ROUTINE COMPLETED TRIGGER (7 tests)
  // ============================================

  describe('Routine Completed Trigger', () => {
    it('should match specific routine ID', async () => {
      const config = { routineId: 'routine-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        routineId: 'routine-123',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different routine ID', async () => {
      const config = { routineId: 'routine-123' };
      const context: RuleContext = {
        familyId: 'family-1',
        routineId: 'routine-456',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match specific routine type', async () => {
      const config = { routineType: 'MORNING' };
      const context: RuleContext = {
        familyId: 'family-1',
        routineType: 'MORNING',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not match different routine type', async () => {
      const config = { routineType: 'MORNING' };
      const context: RuleContext = {
        familyId: 'family-1',
        routineType: 'EVENING',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(false);
    });

    it('should match both routineId and routineType', async () => {
      const config = { routineId: 'routine-123', routineType: 'MORNING' };
      const context: RuleContext = {
        familyId: 'family-1',
        routineId: 'routine-123',
        routineType: 'MORNING',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle empty config as match any', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
        routineId: 'any-routine',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle missing routineId in context', async () => {
      const config = { routineId: 'routine-123' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateRoutineCompletedTrigger(config, context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // TIME BASED TRIGGER (7 tests)
  // ============================================

  describe('Time Based Trigger', () => {
    it('should always return true for time-based triggers', async () => {
      const config = { cron: '0 9 * * *', description: 'Daily at 9 AM' };
      const context: RuleContext = {
        familyId: 'family-1',
        timestamp: new Date(),
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      // Time-based evaluation happens in cron endpoint, trigger always returns true
      expect(result).toBe(true);
    });

    it('should handle birthday trigger', async () => {
      const config = { cron: 'birthday', description: 'On birthday' };
      const context: RuleContext = {
        familyId: 'family-1',
        timestamp: new Date(),
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle weekly cron', async () => {
      const config = { cron: '0 9 * * 0', description: 'Sunday at 9 AM' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle daily cron', async () => {
      const config = { cron: '0 0 * * *', description: 'Daily at midnight' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle interval cron', async () => {
      const config = { cron: '*/15 * * * *', description: 'Every 15 minutes' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should not fail with missing cron', async () => {
      const config = { description: 'No cron' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });

    it('should handle empty config', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await evaluateTimeBasedTrigger(config, context);

      expect(result).toBe(true);
    });
  });
});
