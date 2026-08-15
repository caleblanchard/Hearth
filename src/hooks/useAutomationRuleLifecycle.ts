import { useCallback, useEffect, useState } from 'react'
import {
  deleteAutomationLifecycleRuleRequest,
  fetchAutomationLifecycleRule,
  fetchAutomationLifecycleRules,
  toggleAutomationLifecycleRuleRequest,
  updateAutomationLifecycleRuleRequest,
} from '@/lib/automation-rule-lifecycle-client'
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
  const [rules, setRules] = useState<AutomationRuleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchAutomationLifecycleRules()
      setRules(result.rules)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const toggleRule = useCallback(async (ruleId: string) => {
    const updated = await toggleAutomationLifecycleRuleRequest(ruleId)
    setRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, ...updated } : rule))
    )
    return updated
  }, [])

  const deleteRule = useCallback(async (ruleId: string) => {
    await deleteAutomationLifecycleRuleRequest(ruleId)
    setRules((current) => current.filter((rule) => rule.id !== ruleId))
  }, [])

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
  const [rule, setRule] = useState<AutomationRuleRecord | null>(null)
  const [loading, setLoading] = useState(Boolean(ruleId))
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!ruleId) {
      setRule(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchAutomationLifecycleRule(ruleId)
      setRule(result.rule)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load rule')
      setRule(null)
    } finally {
      setLoading(false)
    }
  }, [ruleId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const saveRule = useCallback(
    async (input: UpdateAutomationRuleInput) => {
      if (!ruleId) {
        throw new Error('Missing rule id')
      }

      const updated = await updateAutomationLifecycleRuleRequest(ruleId, input)
      setRule(updated)
      return updated
    },
    [ruleId]
  )

  return {
    rule,
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
  const [rule, setRule] = useState<AutomationRuleRecord | null>(null)
  const [executions, setExecutions] = useState<AutomationRuleExecutionRecord[]>([])
  const [stats, setStats] = useState<AutomationRuleExecutionStats>({
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
  })
  const [totalExecutions, setTotalExecutions] = useState(0)
  const [loading, setLoading] = useState(Boolean(ruleId))
  const [error, setError] = useState<string | null>(null)

  const filter = options.filter ?? 'all'
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const refetch = useCallback(async () => {
    if (!ruleId) {
      setRule(null)
      setExecutions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchAutomationLifecycleRule(ruleId, {
        limit,
        offset,
        success: historyFilterToSuccess(filter),
      })
      setRule(result.rule)
      setExecutions(result.executions)
      setStats(result.stats)
      setTotalExecutions(result.totalExecutions)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load execution history'
      )
      setRule(null)
      setExecutions([])
    } finally {
      setLoading(false)
    }
  }, [filter, limit, offset, ruleId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    rule,
    executions,
    stats,
    totalExecutions,
    loading,
    error,
    refetch,
  }
}
