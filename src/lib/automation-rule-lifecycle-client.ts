import { createLifecycleClient } from '@/lib/lifecycle-client'
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

const rulesClient = createLifecycleClient<AutomationRuleRecord>({
  basePath: '/api/rules',
  itemKey: 'rule',
})

const executionsClient = createLifecycleClient({ basePath: '/api/rules/executions' })

export function fetchAutomationLifecycleRules(
  query: AutomationRuleListQuery = {},
): Promise<AutomationRuleListResult> {
  return rulesClient.action<AutomationRuleListResult>('', 'GET', undefined, undefined, {
    enabled: query.enabled,
    limit: query.limit,
    offset: query.offset,
  })
}

export function fetchAutomationLifecycleRule(
  ruleId: string,
  query: AutomationRuleHistoryQuery = {},
): Promise<AutomationRuleHistoryResult> {
  return rulesClient.action<AutomationRuleHistoryResult>(`/${ruleId}`, 'GET', undefined, undefined, {
    limit: query.limit,
    offset: query.offset,
    success: query.success,
  })
}

export function createAutomationLifecycleRuleRequest(
  input: CreateAutomationRuleInput,
): Promise<AutomationRuleRecord> {
  return rulesClient.create(input)
}

export function updateAutomationLifecycleRuleRequest(
  ruleId: string,
  input: UpdateAutomationRuleInput,
): Promise<AutomationRuleRecord> {
  return rulesClient.update(ruleId, input)
}

export function deleteAutomationLifecycleRuleRequest(ruleId: string): Promise<void> {
  return rulesClient.remove(ruleId)
}

export function toggleAutomationLifecycleRuleRequest(ruleId: string): Promise<AutomationRuleRecord> {
  return rulesClient.action(`/${ruleId}/toggle`, 'PATCH', undefined, 'rule')
}

export function testAutomationLifecycleRuleRequest(
  ruleId: string,
  context: Record<string, unknown>,
): Promise<unknown> {
  return rulesClient.action<unknown>(`/${ruleId}/test`, 'POST', { context }, 'result')
}

export function fetchAutomationLifecycleExecutions(
  query: AutomationRuleExecutionsQuery,
): Promise<AutomationRuleExecutionsResult> {
  return executionsClient.action<AutomationRuleExecutionsResult>('', 'GET', undefined, undefined, {
    ruleId: query.ruleId,
    limit: query.limit,
    offset: query.offset,
    success: query.success,
    startDate: query.startDate,
    endDate: query.endDate,
  })
}
