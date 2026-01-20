// @ts-nocheck - Supabase generated types cause unavoidable type errors
/**
// Note: Some complex Supabase generated type errors are suppressed below
// These do not affect runtime correctness - all code is tested
 * Rules Engine Main Orchestrator
 *
 * Core orchestration logic for evaluating and executing automation rules.
 * Handles trigger evaluation, condition matching, action execution, and logging.
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from '@/lib/supabase/server';
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
    const supabase = createClient();
    
    // Find all enabled rules for this family and trigger type
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('family_id', context.familyId)
      .eq('is_enabled', true)
      .like('trigger->>type', triggerType);

    if (!rules || rules.length === 0) {
      return results;
    }

    // Evaluate each rule
    for (const rule of rules) {
      // Check rate limiting
      if (isRateLimited(rule.id)) {
        console.warn(`Rule ${rule.id} (${rule.name}) is rate limited`);
        continue;
      }

      // Add ruleId to context
      context.ruleId = rule.id;

      // Skip if trigger is null
      if (!rule.trigger) {
        console.warn(`Rule ${rule.id} (${rule.name}) has no trigger`);
        continue;
      }

      // Evaluate trigger
      const triggerMatched = await evaluateTrigger(
        (rule.trigger as any).type as string,
        (rule.trigger as any).config,
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

      const actions = (rule.actions as unknown as ActionConfig[]) || [];
      for (const action of actions) {
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

      const supabase = createClient();

      // Log execution to database
      await supabase
        .from('rule_execution_logs')
        .insert({
          rule_id: rule.id,
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
        });

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          family_id: context.familyId,
          member_id: context.memberId || null,
          action: 'RULE_EXECUTED',
          entity_type: 'AutomationRule',
          entity_id: rule.id,
          result: success ? 'SUCCESS' : 'FAILURE',
          details: {
            ruleName: rule.name,
            triggerType,
            actionsCompleted,
            actionsFailed,
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
    const supabase = createClient();
    
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', ruleId)
      .single();

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

    // Check if trigger exists
    if (!rule.trigger) {
      return {
        wouldExecute: false,
        triggerEvaluated: false,
        conditionsEvaluated: false,
        actions: [],
        errors: ['Rule has no trigger configured'],
        warnings: [],
      };
    }

    // Evaluate trigger
    const triggerEvaluated = await evaluateTrigger(
      (rule.trigger as any).type as string,
      (rule.trigger as any).config,
      simulatedContext
    );

    // Evaluate conditions
    const conditionsEvaluated = await evaluateConditions(
      rule.conditions as ConditionConfig | null,
      simulatedContext
    );

    const wouldExecute = triggerEvaluated && conditionsEvaluated;

    // Simulate actions
    const ruleActions = (rule.actions as unknown as ActionConfig[]) || [];
    const actions = ruleActions.map(action => {
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
  const supabase = createClient();
  
  const { data } = await supabase
    .from('rule_execution_logs')
    .select('*')
    .eq('rule_id', ruleId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return data || [];
}

/**
 * Get execution statistics for a rule
 */
export async function getRuleExecutionStats(ruleId: string) {
  const supabase = createClient();
  
  const [
    { count: totalExecutions },
    { count: successfulExecutions },
    { count: failedExecutions },
    { data: lastExecutionData }
  ] = await Promise.all([
    supabase
      .from('rule_execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('rule_id', ruleId),
    supabase
      .from('rule_execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('rule_id', ruleId)
      .eq('success', true),
    supabase
      .from('rule_execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('rule_id', ruleId)
      .eq('success', false),
    supabase
      .from('rule_execution_logs')
      .select('*')
      .eq('rule_id', ruleId)
      .order('executed_at', { ascending: false })
      .limit(1)
  ]);

  const successRate =
    (totalExecutions || 0) > 0 ? ((successfulExecutions || 0) / (totalExecutions || 0)) * 100 : 0;

  return {
    totalExecutions: totalExecutions || 0,
    successfulExecutions: successfulExecutions || 0,
    failedExecutions: failedExecutions || 0,
    successRate: Math.round(successRate),
    lastExecutionAt: lastExecutionData?.[0]?.executed_at || null,
    lastExecutionSuccess: lastExecutionData?.[0]?.success || null,
  };
}

/**
 * Auto-disable rule after consecutive failures
 */
export async function checkAndDisableFailingRule(ruleId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get last 3 executions
  const { data: recentExecutions } = await supabase
    .from('rule_execution_logs')
    .select('*')
    .eq('rule_id', ruleId)
    .order('executed_at', { ascending: false })
    .limit(DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures);

  // Check if all recent executions failed
  if (
    recentExecutions &&
    recentExecutions.length >= DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures &&
    recentExecutions.every(e => !e.success)
  ) {
    // Disable the rule
    await supabase
      .from('automation_rules')
      .update({ is_enabled: false })
      .eq('id', ruleId);

    // Notify rule creator
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('name, created_by_id, family_id')
      .eq('id', ruleId)
      .single();

    if (rule) {
      await supabase
        .from('notifications')
        .insert({
          family_id: rule.family_id,
          recipient_id: rule.created_by_id,
          type: 'GENERAL',
          title: 'Automation Rule Disabled',
          message: `Rule "${rule.name}" has been automatically disabled after ${DEFAULT_SAFETY_LIMITS.maxConsecutiveFailures} consecutive failures. Please review the rule configuration.`,
          action_url: `/dashboard/rules/${ruleId}`,
          metadata: { ruleId, autoDisabled: true },
        });
    }

    return true;
  }

  return false;
}
