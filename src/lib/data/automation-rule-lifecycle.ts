import { createClient } from '@/lib/supabase/server'
import {
  LifecycleError,
  readString,
  readNullableString,
  readBoolean,
  readObject,
  readNullableObject,
  requireParentContext,
  writeAuditLog,
} from '@/lib/data/lifecycle-core'
import { dryRunRule } from '@/lib/rules-engine'
import { validateRuleConfiguration } from '@/lib/rules-engine/validation'
import type { Database } from '@/lib/database.types'
import type {
  AutomationRuleAction,
  AutomationRuleConditions,
  AutomationRuleExecutionRecord,
  AutomationRuleExecutionStats,
  AutomationRuleExecutionsQuery,
  AutomationRuleExecutionsResult,
  AutomationRuleHistoryQuery,
  AutomationRuleHistoryResult,
  AutomationRuleListQuery,
  AutomationRuleListResult,
  AutomationRuleRecord,
  AutomationRuleTrigger,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '@/types/automation-rule-lifecycle'

type AutomationRuleInsert = Database['public']['Tables']['automation_rules']['Insert']
type AutomationRuleUpdate = Database['public']['Tables']['automation_rules']['Update']
type AutomationRuleRow = Database['public']['Tables']['automation_rules']['Row']

type LifecycleContext = {
  familyId: string
  memberId: string
}

type RuleRowLike = AutomationRuleRow &
  Record<string, unknown> & {
    created_by_member?: { id: string; name: string | null } | null
    createdByMember?: { id: string; name: string | null } | null
    executions?: Array<{ count?: number | null }> | null
    _count?: { executions?: number | null } | null
  }

type ExecutionRowLike = Record<string, unknown> & {
  id: string
  rule_id?: string
  ruleId?: string
  executed_at?: string
  executedAt?: string
  success: boolean
  error?: string | null
  metadata?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
  rule?: {
    id: string
    name: string
    family_id?: string
    familyId?: string
  } | null
}

function readActionArray(value: unknown): AutomationRuleAction[] {
  return Array.isArray(value) ? (value as AutomationRuleAction[]) : []
}

function readCreator(value: unknown): AutomationRuleRecord['createdByMember'] {
  if (!value) return null

  const creator = Array.isArray(value) ? value[0] : value
  if (!creator || typeof creator !== 'object') return null

  return {
    id: readString((creator as Record<string, unknown>).id),
    name: readNullableString((creator as Record<string, unknown>).name),
  }
}

function readExecutionCount(row: RuleRowLike): number {
  const countFromAggregate = row._count?.executions
  if (typeof countFromAggregate === 'number') return countFromAggregate

  const executions = row.executions
  if (Array.isArray(executions) && typeof executions[0]?.count === 'number') {
    return executions[0].count
  }

  const direct = row.executionCount
  return typeof direct === 'number' ? direct : 0
}

function normalizeRule(row: RuleRowLike): AutomationRuleRecord {
  return {
    id: readString(row.id),
    familyId: readString(row.family_id ?? row.familyId),
    name: readString(row.name),
    description: readNullableString(row.description),
    trigger: readObject(row.trigger) as AutomationRuleTrigger,
    conditions: readNullableObject(row.conditions) as AutomationRuleConditions,
    actions: readActionArray(row.actions),
    isEnabled: readBoolean(row.is_enabled ?? row.isEnabled),
    createdById: readString(row.created_by_id ?? row.createdById),
    createdAt: readString(row.created_at ?? row.createdAt),
    updatedAt: readString(row.updated_at ?? row.updatedAt),
    createdByMember: readCreator(row.created_by_member ?? row.createdByMember),
    executionCount: readExecutionCount(row),
  }
}

function normalizeExecution(row: ExecutionRowLike): AutomationRuleExecutionRecord {
  const rule = row.rule

  return {
    id: readString(row.id),
    ruleId: readString(row.rule_id ?? row.ruleId),
    executedAt: readString(row.executed_at ?? row.executedAt),
    success: readBoolean(row.success),
    error: readNullableString(row.error),
    metadata: readNullableObject(row.metadata),
    result: readNullableObject(row.result),
    rule: rule
      ? {
          id: readString(rule.id),
          name: readString(rule.name),
          familyId: readString(rule.family_id ?? rule.familyId),
        }
      : null,
  }
}

async function requireLifecycleContext(): Promise<LifecycleContext> {
  const context = await requireParentContext('Forbidden - Parent access required')
  return {
    familyId: context.familyId,
    memberId: context.memberId,
  }
}

async function requireOwnedRule(
  ruleId: string,
  familyId: string
): Promise<RuleRowLike> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automation_rules')
    .select(`
      *,
      created_by_member:family_members(id, name)
    `)
    .eq('id', ruleId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new LifecycleError(404, 'Rule not found')
  }

  const row = data as RuleRowLike
  if (readString(row.family_id ?? row.familyId) !== familyId) {
    throw new LifecycleError(403, 'Forbidden')
  }

  return row
}

function validationMessage(
  error: ReturnType<typeof validateRuleConfiguration>
): { message: string; details?: string[] } {
  return {
    message:
      error.error || error.errors?.[0] || 'Invalid rule configuration',
    details: error.errors,
  }
}

function ensureName(name: unknown) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new LifecycleError(400, 'Rule name is required')
  }
}

function ensureActions(actions: unknown, emptyMessage = 'At least one action is required') {
  if (!Array.isArray(actions)) {
    throw new LifecycleError(400, 'Actions must be an array')
  }

  if (actions.length === 0) {
    throw new LifecycleError(400, emptyMessage)
  }
}

function ensureTrigger(trigger: unknown) {
  if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) {
    throw new LifecycleError(400, 'Trigger configuration is required')
  }
}

function validateRuleInput(
  trigger: AutomationRuleTrigger,
  conditions: AutomationRuleConditions,
  actions: AutomationRuleAction[]
) {
  try {
    const result = validateRuleConfiguration(trigger as any, conditions as any, actions as any)
    if (!result.valid) {
      const message = validationMessage(result)
      throw new LifecycleError(400, message.message, message.details)
    }
  } catch (error) {
    if (error instanceof LifecycleError) {
      throw error
    }

    throw new LifecycleError(
      400,
      error instanceof Error ? error.message : 'Invalid rule configuration'
    )
  }
}

function normalizeCreateInput(
  input: CreateAutomationRuleInput,
  context: LifecycleContext
): AutomationRuleInsert {
  ensureName(input.name)
  ensureTrigger(input.trigger)
  ensureActions(input.actions, 'Actions is missing or empty')
  validateRuleInput(
    input.trigger,
    input.conditions ?? null,
    input.actions
  )

  return {
    family_id: context.familyId,
    created_by_id: context.memberId,
    name: input.name.trim(),
    description:
      typeof input.description === 'string' ? input.description.trim() || null : null,
    is_enabled: input.isEnabled ?? true,
    trigger: input.trigger as never,
    conditions: (input.conditions ?? null) as never,
    actions: input.actions as never,
  }
}

function normalizeUpdateInput(
  existing: RuleRowLike,
  input: UpdateAutomationRuleInput
): AutomationRuleUpdate {
  const updates: AutomationRuleUpdate = {}

  if (input.name !== undefined) {
    ensureName(input.name)
    updates.name = input.name.trim()
  }

  if (input.description !== undefined) {
    updates.description =
      typeof input.description === 'string' ? input.description.trim() || null : null
  }

  if (input.actions !== undefined) {
    ensureActions(input.actions)
    updates.actions = input.actions as never
  }

  if (input.trigger !== undefined) {
    ensureTrigger(input.trigger)
    updates.trigger = input.trigger as never
  }

  if (input.conditions !== undefined) {
    updates.conditions = (input.conditions ?? null) as never
  }

  if (input.isEnabled !== undefined) {
    updates.is_enabled = input.isEnabled
  }

  if (
    input.trigger !== undefined ||
    input.conditions !== undefined ||
    input.actions !== undefined
  ) {
    validateRuleInput(
      (input.trigger ?? readObject(existing.trigger)) as AutomationRuleTrigger,
      (input.conditions !== undefined
        ? input.conditions
        : readNullableObject(existing.conditions)) as AutomationRuleConditions,
      (input.actions ?? readActionArray(existing.actions)) as AutomationRuleAction[]
    )
  }

  return updates
}

function normalizeStats(
  totalExecutions: number,
  successfulExecutions: number,
  failedExecutions: number
): AutomationRuleExecutionStats {
  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate:
      totalExecutions > 0
        ? Math.round((successfulExecutions / totalExecutions) * 100)
        : 0,
  }
}

export async function listAutomationLifecycleRules(
  query: AutomationRuleListQuery
): Promise<AutomationRuleListResult> {
  const context = await requireLifecycleContext()
  const supabase = await createClient()
  const limit = Math.min(query.limit ?? 100, 100)
  const offset = query.offset ?? 0

  let request = supabase
    .from('automation_rules')
    .select(`
      *,
      created_by_member:family_members(id, name),
      executions:rule_executions(count)
    `)
    .eq('family_id', context.familyId)
    .order('created_at', { ascending: false })

  if (query.enabled !== undefined) {
    request = request.eq('is_enabled', query.enabled)
  }

  request =
    offset > 0
      ? request.range(offset, offset + limit - 1)
      : request.limit(limit)

  const { data, error } = await request
  if (error) {
    throw error
  }

  const rules = (data ?? []).map((row) => normalizeRule(row as RuleRowLike))
  return {
    rules,
    total: rules.length,
  }
}

export async function getAutomationLifecycleRule(
  ruleId: string,
  query: AutomationRuleHistoryQuery
): Promise<AutomationRuleHistoryResult> {
  const context = await requireLifecycleContext()
  const rule = await requireOwnedRule(ruleId, context.familyId)
  const supabase = await createClient()
  const limit = Math.min(query.limit ?? 10, 100)
  const offset = query.offset ?? 0

  let executionQuery = supabase
    .from('rule_executions')
    .select('id, rule_id, executed_at, success, error, metadata, result', {
      count: 'exact',
    })
    .eq('rule_id', ruleId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.success !== undefined) {
    executionQuery = executionQuery.eq('success', query.success)
  }

  const { data: executionsData, error, count } = await executionQuery
  if (error) {
    throw error
  }

  const { count: totalExecutions } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)

  const { count: successfulExecutions } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('success', true)

  const { count: failedExecutions } = await supabase
    .from('rule_executions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('success', false)

  return {
    rule: normalizeRule(rule),
    executions: (executionsData ?? []).map((execution) =>
      normalizeExecution(execution as ExecutionRowLike)
    ),
    limit,
    offset,
    totalExecutions: count ?? totalExecutions ?? 0,
    stats: normalizeStats(
      totalExecutions ?? 0,
      successfulExecutions ?? 0,
      failedExecutions ?? 0
    ),
  }
}

export async function createAutomationLifecycleRule(
  input: CreateAutomationRuleInput
): Promise<AutomationRuleRecord> {
  const context = await requireLifecycleContext()
  const supabase = await createClient()
  const payload = normalizeCreateInput(input, context)

  const { data, error } = await supabase
    .from('automation_rules')
    .insert(payload)
    .select(`
      *,
      created_by_member:family_members(id, name)
    `)
    .single()

  if (error) {
    throw error
  }

  const rule = normalizeRule(data as RuleRowLike)

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'RULE_CREATED',
    entityType: 'AUTOMATION_RULE',
    entityId: rule.id,
    metadata: {
      name: rule.name,
      triggerType: rule.trigger.type,
    },
  })

  return rule
}

export async function updateAutomationLifecycleRule(
  ruleId: string,
  input: UpdateAutomationRuleInput
): Promise<AutomationRuleRecord> {
  const context = await requireLifecycleContext()
  const existing = await requireOwnedRule(ruleId, context.familyId)
  const supabase = await createClient()
  const updates = normalizeUpdateInput(existing, input)

  const { data, error } = await supabase
    .from('automation_rules')
    .update(updates)
    .eq('id', ruleId)
    .select(`
      *,
      created_by_member:family_members(id, name)
    `)
    .single()

  if (error) {
    throw error
  }

  const rule = normalizeRule(data as RuleRowLike)

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'RULE_UPDATED',
    entityType: 'AUTOMATION_RULE',
    entityId: rule.id,
    metadata: {
      name: rule.name,
      triggerType: rule.trigger.type,
    },
  })

  return rule
}

export async function deleteAutomationLifecycleRule(ruleId: string): Promise<void> {
  const context = await requireLifecycleContext()
  const existing = await requireOwnedRule(ruleId, context.familyId)
  const supabase = await createClient()
  const { error } = await supabase.from('automation_rules').delete().eq('id', ruleId)

  if (error) {
    throw error
  }

  const normalized = normalizeRule(existing)
  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'RULE_DELETED',
    entityType: 'AUTOMATION_RULE',
    entityId: normalized.id,
    metadata: {
      ruleName: normalized.name,
      triggerType: normalized.trigger.type,
    },
  })
}

export async function toggleAutomationLifecycleRule(
  ruleId: string
): Promise<AutomationRuleRecord> {
  const context = await requireLifecycleContext()
  const existing = await requireOwnedRule(ruleId, context.familyId)
  const supabase = await createClient()
  const nextState = !readBoolean(existing.is_enabled ?? existing.isEnabled)

  const { data, error } = await supabase
    .from('automation_rules')
    .update({ is_enabled: nextState })
    .eq('id', ruleId)
    .select(`
      *,
      created_by_member:family_members(id, name)
    `)
    .single()

  if (error) {
    throw error
  }

  const rule = normalizeRule(data as RuleRowLike)

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: rule.isEnabled ? 'RULE_ENABLED' : 'RULE_DISABLED',
    entityType: 'AUTOMATION_RULE',
    entityId: rule.id,
    metadata: {
      previousState: !rule.isEnabled,
    },
  })

  return rule
}

export async function testAutomationLifecycleRule(
  ruleId: string,
  contextInput: Record<string, unknown> | null | undefined
) {
  const context = await requireLifecycleContext()
  await requireOwnedRule(ruleId, context.familyId)

  if (!contextInput || typeof contextInput !== 'object' || Array.isArray(contextInput)) {
    throw new LifecycleError(400, 'Missing context')
  }

  const result = await dryRunRule(ruleId, {
    ...contextInput,
    familyId: context.familyId,
  })

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'RULE_TEST_RUN',
    entityType: 'AUTOMATION_RULE',
    entityId: ruleId,
    metadata: {
      context: {
        ...contextInput,
        familyId: context.familyId,
      },
    },
  })

  return result
}

export async function listAutomationLifecycleExecutions(
  query: AutomationRuleExecutionsQuery
): Promise<AutomationRuleExecutionsResult> {
  const context = await requireLifecycleContext()
  const supabase = await createClient()
  const limit = Math.max(1, Math.min(query.limit ?? 50, 100))
  const offset = Math.max(query.offset ?? 0, 0)

  let request = supabase
    .from('rule_executions')
    .select(`
      *,
      rule:automation_rules!inner(id, name, family_id)
    `, { count: 'exact' })
    .eq('rule.family_id', context.familyId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.ruleId) {
    request = request.eq('rule_id', query.ruleId)
  }

  if (query.success !== undefined) {
    request = request.eq('success', query.success)
  }

  if (query.startDate) {
    request = request.gte('executed_at', query.startDate)
  }

  if (query.endDate) {
    request = request.lte('executed_at', query.endDate)
  }

  const { data, error, count } = await request
  if (error) {
    throw error
  }

  return {
    executions: (data ?? []).map((execution) =>
      normalizeExecution(execution as ExecutionRowLike)
    ),
    total: count ?? 0,
    limit,
    offset,
  }
}
