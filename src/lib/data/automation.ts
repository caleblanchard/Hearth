import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type AutomationRule = Database['public']['Tables']['automation_rules']['Row']
type AutomationRuleInsert = Database['public']['Tables']['automation_rules']['Insert']
type AutomationRuleUpdate = Database['public']['Tables']['automation_rules']['Update']
type RuleExecution = Database['public']['Tables']['rule_executions']['Row']

/**
 * ============================================
 * AUTOMATION RULES
 * ============================================
 */

/**
 * Get automation rules for a family
 */
export async function getAutomationRules(
  familyId: string,
  enabled?: boolean,
  limit?: number,
  offset?: number
) {
  const supabase = await createClient()

  let query = supabase
    .from('automation_rules')
    .select(`
      *,
      created_by_member:family_members(id, name),
      executions:rule_executions(count)
    `)
    .eq('family_id', familyId)

  if (enabled !== undefined) {
    query = query.eq('is_enabled', enabled)
  }

  query = query.order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a single automation rule
 */
export async function getAutomationRule(
  ruleId: string,
  limitExecutions = 10,
  offsetExecutions = 0,
  success?: boolean
) {
  const supabase = await createClient()

  // First get the rule
  const { data: rule, error } = await supabase
    .from('automation_rules')
    .select(`
      *,
      created_by_member:family_members(id, name)
    `)
    .eq('id', ruleId)
    .single()

  if (error) throw error

  // Then get executions with pagination
  let executionsQuery = supabase
    .from('rule_executions')
    .select('id, executed_at, success, error', { count: 'exact' })
    .eq('rule_id', ruleId)
    .order('executed_at', { ascending: false })
    .range(offsetExecutions, offsetExecutions + limitExecutions - 1)

  if (success !== undefined) {
    executionsQuery = executionsQuery.eq('success', success)
  }

  const { data: executions, count } = await executionsQuery

  // Get stats
  const { count: totalCount } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)

  const { count: successCount } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('success', true)

  const { count: failureCount } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('success', false)

  if (rule) {
    (rule as any).executions = executions || [];
    (rule as any).totalExecutions = count || 0;
    (rule as any).stats = {
      totalExecutions: totalCount || 0,
      successfulExecutions: successCount || 0,
      failedExecutions: failureCount || 0,
      successRate: totalCount ? Math.round(((successCount || 0) / totalCount) * 100) : 0
    };
  }

  return rule
}

/**
 * Create automation rule
 */
export async function createAutomationRule(
  rule: AutomationRuleInsert
): Promise<AutomationRule> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_rules')
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update automation rule
 */
export async function updateAutomationRule(
  ruleId: string,
  updates: AutomationRuleUpdate
): Promise<AutomationRule> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Toggle rule active status
 */
export async function toggleAutomationRule(ruleId: string, isActive: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_rules')
    .update({ is_enabled: isActive })
    .eq('id', ruleId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete automation rule
 */
export async function deleteAutomationRule(ruleId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('id', ruleId)

  if (error) throw error
}

/**
 * ============================================
 * RULE EXECUTIONS
 * ============================================
 */

/**
 * Get rule executions
 */
export async function getRuleExecutions(
  familyId?: string,
  ruleId?: string,
  limit = 50,
  offset = 0,
  success?: boolean,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('rule_executions')
    .select(`
      *,
      rule:automation_rules!inner(id, name, family_id)
    `, { count: 'exact' })

  if (familyId) {
    query = query.eq('rule.family_id', familyId)
  }

  if (ruleId) {
    query = query.eq('rule_id', ruleId)
  }

  if (success !== undefined) {
    query = query.eq('success', success)
  }

  if (startDate) {
    query = query.gte('executed_at', startDate)
  }

  if (endDate) {
    query = query.lte('executed_at', endDate)
  }

  query = query
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/**
 * Record rule execution
 */
export async function recordRuleExecution(
  execution: {
    rule_id: string
    success: boolean
    error?: string
    metadata?: any
    result?: any
  }
): Promise<RuleExecution> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rule_executions')
    .insert({
      rule_id: execution.rule_id,
      executed_at: new Date().toISOString(),
      success: execution.success,
      error: execution.error || null,
      metadata: execution.metadata || null,
      result: execution.result || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get rules by trigger type
 */
export async function getRulesByTrigger(
  familyId: string,
  triggerType: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_enabled', true)
    .contains('trigger', { type: triggerType })

  if (error) throw error
  return data || []
}

import { dryRunRule } from '@/lib/rules-engine'

/**
 * Test rule execution (dry run)
 */
export async function testRule(ruleId: string, testData: any) {
  return dryRunRule(ruleId, testData)
}

/**
 * Execute automation rule action
 */
export async function executeAction(
  ruleId: string,
  actionData: any
) {
  const supabase = await createClient()

  // Get the rule
  const { data: rule } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('id', ruleId)
    .single()

  if (!rule) throw new Error('Rule not found')

  // Record execution
  await recordRuleExecution({
    rule_id: ruleId,
    success: true,
    metadata: { timestamp: new Date().toISOString() },
    result: actionData,
  })

  // The actual action execution would be handled by the rules engine
  // This is just a stub
  return {
    success: true,
    ruleId,
    actionData,
  }
}

/**
 * Test automation rule (alias for testRule)
 */
export async function testAutomationRule(ruleId: string, testData: any) {
  return testRule(ruleId, testData)
}
