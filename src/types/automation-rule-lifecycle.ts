export interface AutomationRuleTrigger {
  type: string
  config?: Record<string, unknown>
  [key: string]: unknown
}

export interface AutomationRuleAction {
  type: string
  config?: Record<string, unknown>
  [key: string]: unknown
}

export type AutomationRuleConditions = Record<string, unknown> | null

export interface AutomationRuleCreator {
  id: string
  name: string | null
}

export interface AutomationRuleRecord {
  id: string
  familyId: string
  name: string
  description: string | null
  trigger: AutomationRuleTrigger
  conditions: AutomationRuleConditions
  actions: AutomationRuleAction[]
  isEnabled: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  createdByMember: AutomationRuleCreator | null
  executionCount?: number
}

export interface AutomationRuleExecutionRecord {
  id: string
  ruleId: string
  executedAt: string
  success: boolean
  error: string | null
  metadata: Record<string, unknown> | null
  result: Record<string, unknown> | null
  rule?: {
    id: string
    name: string
    familyId: string
  } | null
}

export interface AutomationRuleExecutionStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
}

export interface AutomationRuleListQuery {
  enabled?: boolean
  limit?: number
  offset?: number
}

export interface AutomationRuleHistoryQuery {
  limit?: number
  offset?: number
  success?: boolean
}

export interface AutomationRuleExecutionsQuery extends AutomationRuleHistoryQuery {
  ruleId?: string
  startDate?: string
  endDate?: string
}

export interface CreateAutomationRuleInput {
  name: string
  description?: string | null
  isEnabled?: boolean
  trigger: AutomationRuleTrigger
  conditions?: AutomationRuleConditions
  actions: AutomationRuleAction[]
}

export interface UpdateAutomationRuleInput {
  name?: string
  description?: string | null
  isEnabled?: boolean
  trigger?: AutomationRuleTrigger
  conditions?: AutomationRuleConditions
  actions?: AutomationRuleAction[]
}

export interface AutomationRuleListResult {
  rules: AutomationRuleRecord[]
  total: number
}

export interface AutomationRuleHistoryResult {
  rule: AutomationRuleRecord
  executions: AutomationRuleExecutionRecord[]
  limit: number
  offset: number
  totalExecutions: number
  stats: AutomationRuleExecutionStats
}

export interface AutomationRuleExecutionsResult {
  executions: AutomationRuleExecutionRecord[]
  total: number
  limit: number
  offset: number
}

export type AutomationRuleHistoryFilter = 'all' | 'success' | 'failed'
