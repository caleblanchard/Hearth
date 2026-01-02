/**
 * Rules Engine Main Orchestrator
 *
 * Core orchestration logic for evaluating and executing automation rules.
 * Handles trigger evaluation, condition matching, action execution, and logging.
 */

import prisma from '@/lib/prisma';
import { evaluateTrigger } from './triggers';
import { executeAction } from './actions';
import {
  TriggerType,
  RuleContext,
  RuleExecutionResult,
  ConditionConfig,
  DryRunResult,
  ActionConfig,
  DEFAULT_SAFETY_LIMITS,
} from './types';

// ============================================
// RATE LIMITING
// ============================================

// In-memory cache for rate limiting
const executionCache = new Map<string, number[]>();

/**
 * Check if a rule is rate limited
 */
export function isRateLimited(ruleId: string): boolean {
  const now = Date.now();
  const executions = executionCache.get(ruleId) || [];

  // Remove executions older than 1 hour
  const recent = executions.filter(ts => now - ts < 3600000);

  if (recent.length >= DEFAULT_SAFETY_LIMITS.maxExecutionsPerHour) {
    return true; // Rate limited
  }

  recent.push(now);
  executionCache.set(ruleId, recent);
  return false;
}

/**
 * Clear rate limit cache (for testing)
 */
export function clearRateLimitCache(): void {
  executionCache.clear();
}

// ============================================
// CONDITION EVALUATION
// ============================================

/**
 * Evaluate conditions against context
 */
export async function evaluateConditions(
  conditions: ConditionConfig | null,
  context: RuleContext
): Promise<boolean> {
  if (!conditions) {
    return true; // No conditions means always match
  }

  const results: boolean[] = [];

  for (const rule of conditions.rules) {
    const contextValue = context[rule.field];

    let matches = false;

    switch (rule.operator) {
      case 'equals':
        matches = contextValue === rule.value;
        break;
      case 'gt':
        matches = contextValue > rule.value;
        break;
      case 'lt':
        matches = contextValue < rule.value;
        break;
      case 'gte':
        matches = contextValue >= rule.value;
        break;
      case 'lte':
        matches = contextValue <= rule.value;
        break;
      case 'contains':
        matches = String(contextValue).includes(String(rule.value));
        break;
    }

    results.push(matches);
  }

  // Apply logical operator
  if (conditions.operator === 'AND') {
    return results.every(r => r);
  } else {
    // OR
    return results.some(r => r);
  }
}

// ============================================
// MAIN RULE EVALUATION
// ============================================

/**
 * Evaluate and execute matching rules for a trigger type
 */
export async function evaluateRules(
  triggerType: TriggerType,
  context: RuleContext
): Promise<RuleExecutionResult[]> {
  const results: RuleExecutionResult[] = [];

  try {
    // Find all enabled rules for this family and trigger type
    const rules = await prisma.automationRule.findMany({
      where: {
        familyId: context.familyId,
        isEnabled: true,
        trigger: {
          path: ['type'],
          equals: triggerType,
        },
      },
    });

    // Evaluate each rule
    for (const rule of rules) {
      // Check rate limiting
      if (isRateLimited(rule.id)) {
        console.warn(`Rule ${rule.id} (${rule.name}) is rate limited`);
        continue;
      }

      // Add ruleId to context
      context.ruleId = rule.id;

      // Evaluate trigger
      const triggerMatched = await evaluateTrigger(
        rule.trigger.type as string,
        rule.trigger.config,
        context
      );

      if (!triggerMatched) {
        continue; // Trigger didn't match, skip this rule
      }

      // Evaluate conditions
      const conditionsMatched = await evaluateConditions(
        rule.conditions as ConditionConfig | null,
        context
      );

      if (!conditionsMatched) {
        continue; // Conditions didn't match, skip this rule
      }

      // Execute actions
      const actionResults = [];
      const errors: string[] = [];
      let actionsCompleted = 0;
      let actionsFailed = 0;

      for (const action of rule.actions as ActionConfig[]) {
        const result = await executeAction(
          action.type,
          action.config,
          context
        );

        actionResults.push(result);

        if (result.success) {
          actionsCompleted++;
        } else {
          actionsFailed++;
          if (result.error) {
            errors.push(`${action.type}: ${result.error}`);
          }
        }
      }

      const success = actionsFailed === 0;

      // Log execution to database
      await prisma.ruleExecution.create({
        data: {
          ruleId: rule.id,
          success,
          result: {
            actionsCompleted,
            actionsFailed,
            actionResults,
          },
          error: errors.length > 0 ? errors.join('; ') : null,
          metadata: {
            triggerType,
            triggerMatched,
            conditionsMatched,
            context: {
              memberId: context.memberId,
              triggerId: context.triggerId,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          familyId: context.familyId,
          memberId: context.memberId || null,
          action: 'RULE_EXECUTED',
          entityType: 'AutomationRule',
          entityId: rule.id,
          result: success ? 'SUCCESS' : 'FAILURE',
          metadata: {
            ruleName: rule.name,
            triggerType,
            actionsCompleted,
            actionsFailed,
          },
        },
      });

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        success,
        triggerMatched,
        conditionsMatched,
        actionsCompleted,
        actionsFailed,
        actionResults,
        errors,
        executedAt: new Date(),
      });
    }

    return results;
  } catch (error) {
    console.error('Error evaluating rules:', error);
    return results;
  }
}

// ============================================
// DRY RUN (TESTING)
// ============================================

/**
 * Test a rule without executing actions (dry run)
 */
export async function dryRunRule(
  ruleId: string,
  simulatedContext: RuleContext
): Promise<DryRunResult> {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return {
        wouldExecute: false,
        triggerEvaluated: false,
        conditionsEvaluated: false,
        actions: [],
        errors: ['Rule not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Evaluate trigger
    const triggerEvaluated = await evaluateTrigger(
      rule.trigger.type as string,
      rule.trigger.config,
      simulatedContext
    );

    // Evaluate conditions
    const conditionsEvaluated = await evaluateConditions(
      rule.conditions as ConditionConfig | null,
      simulatedContext
    );

    const wouldExecute = triggerEvaluated && conditionsEvaluated;

    // Simulate actions
    const actions = (rule.actions as ActionConfig[]).map(action => {
      let simulation = '';

      switch (action.type) {
        case 'award_credits':
          simulation = `Would award ${action.config.amount} credits to member`;
          break;
        case 'send_notification':
          simulation = `Would send notification: "${action.config.title}" to ${action.config.recipients.length} recipient(s)`;
          break;
        case 'add_shopping_item':
          simulation = `Would add "${action.config.itemName || 'inventory item'}" to shopping list`;
          break;
        case 'create_todo':
          simulation = `Would create todo: "${action.config.title}"`;
          break;
        case 'lock_medication':
          simulation = `Would lock medication for ${action.config.hours} hours`;
          break;
        case 'suggest_meal':
          simulation = `Would suggest meals with difficulty: ${action.config.difficulty || 'any'}`;
          break;
        case 'reduce_chores':
          simulation = `Would reduce chores by ${action.config.percentage}% for ${action.config.duration} days`;
          break;
        case 'adjust_screentime':
          simulation = `Would adjust screen time by ${action.config.amountMinutes > 0 ? '+' : ''}${action.config.amountMinutes} minutes`;
          break;
        default:
          simulation = `Unknown action type: ${action.type}`;
      }

      return {
        type: action.type,
        wouldExecute,
        simulation,
      };
    });

    return {
      wouldExecute,
      triggerEvaluated,
      conditionsEvaluated,
      actions,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      wouldExecute: false,
      triggerEvaluated: false,
      conditionsEvaluated: false,
      actions: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get execution history for a rule
 */
export async function getRuleExecutionHistory(
  ruleId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.ruleExecution.findMany({
    where: { ruleId },
    orderBy: { executedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get execution statistics for a rule
 */
export async function getRuleExecutionStats(ruleId: string) {
  const [totalExecutions, successfulExecutions, failedExecutions, lastExecution] =
    await Promise.all([
      prisma.ruleExecution.count({ where: { ruleId } }),
      prisma.ruleExecution.count({ where: { ruleId, success: true } }),
      prisma.ruleExecution.count({ where: { ruleId, success: false } }),
      prisma.ruleExecution.findFirst({
        where: { ruleId },
        orderBy: { executedAt: 'desc' },
      }),
    ]);

  const successRate =
    totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate: Math.round(successRate),
    lastExecutionAt: lastExecution?.executedAt || null,
    lastExecutionSuccess: lastExecution?.success || null,
  };
}

/**
 * Auto-disable rule after consecutive failures
 */
export async function checkAndDisableFailingRule(ruleId: string): Promise<boolean> {
  // Get last 3 executions
  const recentExecutions = await prisma.ruleExecution.findMany({
    where: { ruleId },
    orderBy: { executedAt: 'desc' },
    take: DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures,
  });

  // Check if all recent executions failed
  if (
    recentExecutions.length >= DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures &&
    recentExecutions.every(e => !e.success)
  ) {
    // Disable the rule
    await prisma.automationRule.update({
      where: { id: ruleId },
      data: { isEnabled: false },
    });

    // Notify rule creator
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { name: true, createdById: true, familyId: true },
    });

    if (rule) {
      await prisma.notification.create({
        data: {
          userId: rule.createdById,
          type: 'GENERAL',
          title: 'Automation Rule Disabled',
          message: `Rule "${rule.name}" has been automatically disabled after ${DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures} consecutive failures. Please review the rule configuration.`,
          actionUrl: `/dashboard/rules/${ruleId}`,
          metadata: { ruleId, autoDisabled: true } as any,
        },
      });
    }

    return true;
  }

  return false;
}
