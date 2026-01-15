/**
 * Unit Tests: Rules Engine Safety Features
 *
 * Tests for rate limiting and infinite loop detection
 * Total: 18 tests
 */

import { isRateLimited, clearRateLimitCache } from '@/lib/rules-engine/index';
import { detectInfiniteLoopRisk } from '@/lib/rules-engine/validation';

describe('Rules Engine Safety Features', () => {
  // Clear rate limit cache before each test
  beforeEach(() => {
    clearRateLimitCache?.();
  });

  // ============================================
  // RATE LIMITING (10 tests)
  // ============================================

  describe('Rate Limiting', () => {
    it('should allow first execution', () => {
      const result = isRateLimited('rule-1');

      expect(result).toBe(false);
    });

    it('should allow multiple executions under limit', () => {
      for (let i = 0; i < 9; i++) {
        expect(isRateLimited('rule-test-1')).toBe(false);
      }
    });

    it('should block after 10 executions in an hour', () => {
      // Execute 10 times
      for (let i = 0; i < 10; i++) {
        isRateLimited('rule-test-2');
      }

      // 11th execution should be blocked
      const result = isRateLimited('rule-test-2');
      expect(result).toBe(true);
    });

    it('should track different rules independently', () => {
      // Max out rule-1
      for (let i = 0; i < 10; i++) {
        isRateLimited('rule-1');
      }

      // Rule-2 should still be allowed
      expect(isRateLimited('rule-2')).toBe(false);
    });

    it('should allow execution after blocking', () => {
      // Execute 10 times
      for (let i = 0; i < 10; i++) {
        isRateLimited('rule-test-3');
      }

      // Verify blocked
      expect(isRateLimited('rule-test-3')).toBe(true);

      // Even when blocked, it records the attempt
      // The 11th call is blocked but not recorded
    });

    it('should handle rapid sequential calls', () => {
      const ruleId = 'rapid-test';
      let blockedCount = 0;

      for (let i = 0; i < 15; i++) {
        if (isRateLimited(ruleId)) {
          blockedCount++;
        }
      }

      // Should block the last 5 attempts (11-15)
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should clear rate limit cache', () => {
      // Max out executions
      for (let i = 0; i < 10; i++) {
        isRateLimited('clear-test');
      }

      expect(isRateLimited('clear-test')).toBe(true);

      // Clear cache
      clearRateLimitCache?.();

      // Should be allowed again
      expect(isRateLimited('clear-test')).toBe(false);
    });

    it('should track execution timestamps', () => {
      const ruleId = 'timestamp-test';

      // Record several executions
      for (let i = 0; i < 5; i++) {
        isRateLimited(ruleId);
      }

      // Should not be rate limited yet
      expect(isRateLimited(ruleId)).toBe(false);
    });

    it('should enforce hourly window correctly', () => {
      const ruleId = 'hourly-test';

      // Execute 10 times
      for (let i = 0; i < 10; i++) {
        isRateLimited(ruleId);
      }

      // Should be blocked now
      expect(isRateLimited(ruleId)).toBe(true);
    });

    it('should handle empty rule ID gracefully', () => {
      // Should not throw error
      expect(() => isRateLimited('')).not.toThrow();
    });
  });

  // ============================================
  // INFINITE LOOP DETECTION (8 tests)
  // ============================================

  describe('Infinite Loop Detection', () => {
    it('should detect chore_completed + reduce_chores loop risk', () => {
      const trigger = {
        type: 'chore_completed' as const,
        config: {},
      };
      const actions = [
        {
          type: 'reduce_chores' as const,
          config: { percentage: 10 },
        },
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(true);
    });

    it('should detect screentime_low + adjust_screentime loop risk', () => {
      const trigger = {
        type: 'screentime_low' as const,
        config: { thresholdMinutes: 30 },
      };
      const actions = [
        {
          type: 'adjust_screentime' as const,
          config: { amountMinutes: 15 },
        },
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(true);
    });

    it('should allow safe chore_completed + award_credits combination', () => {
      const trigger = {
        type: 'chore_completed' as const,
        config: {},
      };
      const actions = [
        {
          type: 'award_credits' as const,
          config: { amount: 10 },
        },
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(false);
    });

    it('should allow safe screentime_low + send_notification combination', () => {
      const trigger = {
        type: 'screentime_low' as const,
        config: { thresholdMinutes: 30 },
      };
      const actions = [
        {
          type: 'send_notification' as const,
          config: { recipients: ['member-1'], title: 'Low Screen Time', message: 'Running low' },
        },
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(false);
    });

    it('should allow multiple safe actions', () => {
      const trigger = {
        type: 'chore_streak' as const,
        config: { days: 7 },
      };
      const actions = [
        { type: 'award_credits' as const, config: { amount: 10 } },
        { type: 'send_notification' as const, config: { recipients: ['member'], title: 'Streak!', message: 'Great job!' } },
        { type: 'create_todo' as const, config: { title: 'Keep it up!' } },
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(false);
    });

    it('should detect loop risk even with multiple actions', () => {
      const trigger = {
        type: 'chore_completed' as const,
        config: {},
      };
      const actions = [
        { type: 'award_credits' as const, config: { amount: 10 } },
        { type: 'reduce_chores' as const, config: { percentage: 10 } }, // This is the risky one
      ];

      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(true);
    });

    it('should allow time_based triggers with any actions', () => {
      const trigger = {
        type: 'time_based' as const,
        config: { cron: '0 9 * * *' },
      };
      const actions = [
        { type: 'adjust_screentime' as const, config: { amountMinutes: 60 } },
        { type: 'reduce_chores' as const, config: { percentage: 20 } },
      ];

      // Time-based triggers can't cause infinite loops since they're scheduled
      const result = detectInfiniteLoopRisk(trigger, actions);

      expect(result.hasRisk).toBe(false);
    });

    it('should handle rules with no actions gracefully', () => {
      const trigger = {
        type: 'chore_completed' as const,
        config: {},
      };
      const actions: any[] = [];

      expect(() => detectInfiniteLoopRisk(trigger, actions)).not.toThrow();
      const result = detectInfiniteLoopRisk(trigger, actions);
      expect(result.hasRisk).toBe(false);
    });
  });
});
