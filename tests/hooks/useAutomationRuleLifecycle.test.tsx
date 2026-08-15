import { act, renderHook, waitFor } from '@testing-library/react'
import {
  useAutomationRuleEditor,
  useAutomationRuleHistory,
  useAutomationRules,
} from '@/hooks/useAutomationRuleLifecycle'

global.fetch = jest.fn()

const mockRule = {
  id: 'rule-1',
  familyId: 'family-test-123',
  name: 'Test Rule',
  description: 'Test description',
  trigger: {
    type: 'chore_completed',
    config: { anyChore: true },
  },
  conditions: null,
  actions: [
    {
      type: 'award_credits',
      config: { amount: 10 },
    },
  ],
  isEnabled: true,
  createdById: 'parent-test-123',
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
  createdByMember: {
    id: 'parent-test-123',
    name: 'Test Parent',
  },
  executionCount: 3,
}

describe('useAutomationRuleLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('loads rules and supports toggle/delete mutations', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [mockRule],
          total: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rule: { ...mockRule, isEnabled: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      })

    const { result } = renderHook(() => useAutomationRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rules).toEqual([mockRule])

    await act(async () => {
      await result.current.toggleRule('rule-1')
    })

    expect(result.current.rules[0]?.isEnabled).toBe(false)

    await act(async () => {
      await result.current.deleteRule('rule-1')
    })

    expect(result.current.rules).toEqual([])
  })

  it('loads a rule for editing and persists updates through the shared adapter', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rule: mockRule,
          executions: [],
          totalExecutions: 0,
          limit: 10,
          offset: 0,
          stats: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            successRate: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rule: {
            ...mockRule,
            name: 'Updated Rule',
            isEnabled: false,
          },
        }),
      })

    const { result } = renderHook(() => useAutomationRuleEditor('rule-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rule?.name).toBe('Test Rule')

    await act(async () => {
      await result.current.saveRule({
        name: 'Updated Rule',
        description: 'Updated description',
        isEnabled: false,
      })
    })

    expect(result.current.rule?.name).toBe('Updated Rule')
    expect(result.current.rule?.isEnabled).toBe(false)
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/rules/rule-1',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('loads combined rule history from the lifecycle route and reacts to filter changes', async () => {
    type HistoryProps = {
      filter: 'all' | 'failed'
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rule: mockRule,
          executions: [
            {
              id: 'exec-1',
              ruleId: 'rule-1',
              success: true,
              error: null,
              metadata: {},
              result: { actionsCompleted: 1, actionsFailed: 0 },
              executedAt: '2026-05-21T10:00:00.000Z',
            },
          ],
          totalExecutions: 1,
          limit: 50,
          offset: 0,
          stats: {
            totalExecutions: 1,
            successfulExecutions: 1,
            failedExecutions: 0,
            successRate: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rule: mockRule,
          executions: [
            {
              id: 'exec-2',
              ruleId: 'rule-1',
              success: false,
              error: 'Action failed',
              metadata: {},
              result: { actionsCompleted: 0, actionsFailed: 1 },
              executedAt: '2026-05-22T10:00:00.000Z',
            },
          ],
          totalExecutions: 1,
          limit: 50,
          offset: 0,
          stats: {
            totalExecutions: 1,
            successfulExecutions: 0,
            failedExecutions: 1,
            successRate: 0,
          },
        }),
      })

    const { result, rerender } = renderHook(
      ({ filter }) =>
        useAutomationRuleHistory('rule-1', {
          filter,
          limit: 50,
          offset: 0,
        }),
      {
        initialProps: { filter: 'all' } as HistoryProps,
      }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rule?.name).toBe('Test Rule')
    expect(result.current.executions).toHaveLength(1)
    expect(result.current.stats.successRate).toBe(100)

    rerender({ filter: 'failed' } as HistoryProps)

    await waitFor(() => {
      expect(result.current.stats.failedExecutions).toBe(1)
    })

    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/rules/rule-1?limit=50&offset=0&success=false'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })
})
