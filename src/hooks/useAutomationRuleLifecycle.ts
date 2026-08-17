import { useCallback } from 'react'
import {
  deleteAutomationLifecycleRuleRequest,
  fetchAutomationLifecycleRule,
  fetchAutomationLifecycleRules,
  toggleAutomationLifecycleRuleRequest,
  updateAutomationLifecycleRuleRequest,
} from '@/lib/automation-rule-lifecycle-client'
import { useRemoteResource } from '@/hooks/useRemoteResource'
import type {
  AutomationRuleExecutionRecord,
  AutomationRuleExecutionStats,
  AutomationRuleHistoryFilter,
  AutomationRuleRecord,
  UpdateAutomationRuleInput,
} from '@/types/automation-rule-lifecycle'

function historyFilterToSuccess(filter: AutomationRuleHistoryFilter): boolean | undefined {
  if (filter === 'success') return true
  if (filter === 'failed') return false
  return undefined
}

export function useAutomationRules() {
  const loader = useCallback(() => fetchAutomationLifecycleRules(), [])
  const { data, loading, error, refetch, setData } = useRemoteResource(loader, {
    errorMessage: 'Failed to load rules',
  })
  const rules = data?.rules ?? []

  const toggleRule = useCallback(
    async (ruleId: string) => {
      const updated = await toggleAutomationLifecycleRuleRequest(ruleId)
      setData((current) =>
        current
          ? {
              ...current,
              rules: current.rules.map((rule) =>
                rule.id === ruleId ? { ...rule, ...updated } : rule
              ),
            }
          : current
      )
      return updated
    },
    [setData]
  )

  const deleteRule = useCallback(
    async (ruleId: string) => {
      await deleteAutomationLifecycleRuleRequest(ruleId)
      setData((current) =>
        current
          ? { ...current, rules: current.rules.filter((rule) => rule.id !== ruleId) }
          : current
      )
    },
    [setData]
  )

  return {
    rules,
    loading,
    error,
    refetch,
    toggleRule,
    deleteRule,
  }
}

export function useAutomationRuleEditor(ruleId: string | null | undefined) {
  const enabled = Boolean(ruleId)
  const loader = useCallback(async () => {
    if (!ruleId) {
      throw new Error('Missing rule id')
    }
    const result = await fetchAutomationLifecycleRule(ruleId)
    return result.rule
  }, [ruleId])
  const { data, loading, error, refetch, setData } = useRemoteResource(loader, {
    enabled,
    errorMessage: 'Failed to load rule',
  })

  const saveRule = useCallback(
    async (input: UpdateAutomationRuleInput) => {
      if (!ruleId) {
        throw new Error('Missing rule id')
      }

      const updated = await updateAutomationLifecycleRuleRequest(ruleId, input)
      setData(updated)
      return updated
    },
    [ruleId, setData]
  )

  return {
    rule: data,
    loading,
    error,
    refetch,
    saveRule,
  }
}

export function useAutomationRuleHistory(
  ruleId: string | null | undefined,
  options: {
    filter?: AutomationRuleHistoryFilter
    limit?: number
    offset?: number
  } = {}
) {
  const enabled = Boolean(ruleId)
  const filter = options.filter ?? 'all'
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const loader = useCallback(async () => {
    if (!ruleId) {
      throw new Error('Missing rule id')
    }
    return fetchAutomationLifecycleRule(ruleId, {
      limit,
      offset,
      success: historyFilterToSuccess(filter),
    })
  }, [filter, limit, offset, ruleId])
  const { data, loading, error, refetch } = useRemoteResource(loader, {
    enabled,
    errorMessage: 'Failed to load execution history',
  })

  const executions: AutomationRuleExecutionRecord[] = data?.executions ?? []
  const stats: AutomationRuleExecutionStats = data?.stats ?? {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
  }

  return {
    rule: data?.rule ?? null,
    executions,
    stats,
    totalExecutions: data?.totalExecutions ?? 0,
    loading,
    error,
    refetch,
  }
}
