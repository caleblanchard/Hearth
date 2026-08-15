import type {
  AutomationRuleExecutionsQuery,
  AutomationRuleExecutionsResult,
  AutomationRuleHistoryQuery,
  AutomationRuleHistoryResult,
  AutomationRuleListQuery,
  AutomationRuleListResult,
  AutomationRuleRecord,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '@/types/automation-rule-lifecycle'
import { apiRequest, buildQueryString } from '@/lib/api-client'

export async function fetchAutomationLifecycleRules(
  query: AutomationRuleListQuery = {}
): Promise<AutomationRuleListResult> {
  const suffix = buildQueryString({
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
    limit: query.limit === undefined ? undefined : String(query.limit),
    offset: query.offset === undefined ? undefined : String(query.offset),
  })

  return apiRequest<AutomationRuleListResult>(`/api/rules${suffix}`)
}

export async function fetchAutomationLifecycleRule(
  ruleId: string,
  query: AutomationRuleHistoryQuery = {}
): Promise<AutomationRuleHistoryResult> {
  const suffix = buildQueryString({
    limit: query.limit === undefined ? undefined : String(query.limit),
    offset: query.offset === undefined ? undefined : String(query.offset),
    success: query.success === undefined ? undefined : String(query.success),
  })

  return apiRequest<AutomationRuleHistoryResult>(`/api/rules/${ruleId}${suffix}`)
}

export async function createAutomationLifecycleRuleRequest(
  input: CreateAutomationRuleInput
): Promise<AutomationRuleRecord> {
  const data = await apiRequest<{ rule: AutomationRuleRecord }>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.rule
}

export async function updateAutomationLifecycleRuleRequest(
  ruleId: string,
  input: UpdateAutomationRuleInput
): Promise<AutomationRuleRecord> {
  const data = await apiRequest<{ rule: AutomationRuleRecord }>(`/api/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.rule
}

export async function deleteAutomationLifecycleRuleRequest(ruleId: string): Promise<void> {
  await apiRequest<{ success: true }>(`/api/rules/${ruleId}`, {
    method: 'DELETE',
  })
}

export async function toggleAutomationLifecycleRuleRequest(
  ruleId: string
): Promise<AutomationRuleRecord> {
  const data = await apiRequest<{ rule: AutomationRuleRecord }>(
    `/api/rules/${ruleId}/toggle`,
    { method: 'PATCH' }
  )
  return data.rule
}

export async function testAutomationLifecycleRuleRequest(
  ruleId: string,
  context: Record<string, unknown>
) {
  const data = await apiRequest<{ result: unknown }>(`/api/rules/${ruleId}/test`, {
    method: 'POST',
    body: JSON.stringify({ context }),
  })
  return data.result
}

export async function fetchAutomationLifecycleExecutions(
  query: AutomationRuleExecutionsQuery
): Promise<AutomationRuleExecutionsResult> {
  const suffix = buildQueryString({
    ruleId: query.ruleId,
    limit: query.limit === undefined ? undefined : String(query.limit),
    offset: query.offset === undefined ? undefined : String(query.offset),
    success: query.success === undefined ? undefined : String(query.success),
    startDate: query.startDate,
    endDate: query.endDate,
  })

  return apiRequest<AutomationRuleExecutionsResult>(`/api/rules/executions${suffix}`)
}
