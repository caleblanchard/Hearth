import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'
import {
  mockChildSession,
  mockParentSession,
} from '@/lib/test-utils/auth-mock'
import {
  createAutomationLifecycleRule,
  getAutomationLifecycleRule,
  listAutomationLifecycleExecutions,
  listAutomationLifecycleRules,
  testAutomationLifecycleRule,
  toggleAutomationLifecycleRule,
  updateAutomationLifecycleRule,
} from '@/lib/data/automation-rule-lifecycle'

jest.mock('@/lib/rules-engine', () => ({
  dryRunRule: jest.fn(),
}))

jest.mock('@/lib/rules-engine/validation', () => ({
  validateRuleConfiguration: jest.fn(() => ({ valid: true })),
}))

const { dryRunRule } = require('@/lib/rules-engine')
const { validateRuleConfiguration } = require('@/lib/rules-engine/validation')

const mockRuleRow = {
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
      config: { amount: 10, reason: 'Bonus' },
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
}

describe('automation-rule-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
    mockParentSession()
    validateRuleConfiguration.mockReturnValue({ valid: true })
  })

  it('rejects non-parent callers before listing rules', async () => {
    mockChildSession()

    await expect(listAutomationLifecycleRules({})).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden - Parent access required',
    })
  })

  it('lists normalized automation rules for the active family', async () => {
    dbMock.automationRule.findMany.mockResolvedValue([
      {
        ...mockRuleRow,
        executions: [{ count: 3 }],
      },
    ] as never)

    const result = await listAutomationLifecycleRules({
      enabled: true,
      limit: 25,
      offset: 0,
    })

    expect(result.total).toBe(1)
    expect(result.rules).toEqual([
      expect.objectContaining({
        id: 'rule-1',
        familyId: 'family-test-123',
        name: 'Test Rule',
        isEnabled: true,
        executionCount: 3,
        createdByMember: {
          id: 'parent-test-123',
          name: 'Test Parent',
        },
      }),
    ])
  })

  it('returns a normalized rule detail with execution history and stats', async () => {
    dbMock.automationRule.findUnique.mockResolvedValue(mockRuleRow as never)
    dbMock.ruleExecution.findMany.mockResolvedValue([
      {
        id: 'exec-1',
        ruleId: 'rule-1',
        success: true,
        error: null,
        metadata: { triggerType: 'chore_completed' },
        result: { actionsCompleted: 1, actionsFailed: 0 },
        executedAt: '2026-05-21T10:00:00.000Z',
      },
    ] as never)
    dbMock.ruleExecution.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)

    const result = await getAutomationLifecycleRule('rule-1', {
      limit: 10,
      offset: 0,
      success: true,
    })

    expect(result.rule).toEqual(
      expect.objectContaining({
        id: 'rule-1',
        name: 'Test Rule',
        isEnabled: true,
      })
    )
    expect(result.executions).toEqual([
      expect.objectContaining({
        id: 'exec-1',
        ruleId: 'rule-1',
        executedAt: '2026-05-21T10:00:00.000Z',
        success: true,
      }),
    ])
    expect(result.totalExecutions).toBe(1)
    expect(result.stats).toEqual({
      totalExecutions: 1,
      successfulExecutions: 1,
      failedExecutions: 0,
      successRate: 100,
    })
  })

  it('creates a rule with validated, normalized input and an audit record', async () => {
    dbMock.automationRule.create.mockResolvedValue({
      ...mockRuleRow,
      name: 'Morning Bonus',
      description: 'Award credits for chores',
    } as never)
    dbMock.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

    const result = await createAutomationLifecycleRule({
      name: '  Morning Bonus  ',
      description: '  Award credits for chores  ',
      isEnabled: true,
      trigger: {
        type: 'chore_completed',
        config: { anyChore: true },
      },
      conditions: null,
      actions: [
        {
          type: 'award_credits',
          config: { amount: 10, reason: 'Bonus' },
        },
      ],
    })

    expect(validateRuleConfiguration).toHaveBeenCalledWith(
      { type: 'chore_completed', config: { anyChore: true } },
      null,
      [{ type: 'award_credits', config: { amount: 10, reason: 'Bonus' } }]
    )
    expect(result.name).toBe('Morning Bonus')
    expect(dbMock.auditLog.create).toHaveBeenCalled()
  })

  it('updates a rule by validating against the merged lifecycle state', async () => {
    dbMock.automationRule.findUnique.mockResolvedValue(mockRuleRow as never)
    dbMock.automationRule.update.mockResolvedValue({
      ...mockRuleRow,
      name: 'Updated Rule Name',
    } as never)
    dbMock.auditLog.create.mockResolvedValue({ id: 'audit-2' } as never)

    const result = await updateAutomationLifecycleRule('rule-1', {
      name: '  Updated Rule Name  ',
    })

    expect(validateRuleConfiguration).not.toHaveBeenCalled()
    expect(result.name).toBe('Updated Rule Name')
    expect(dbMock.auditLog.create).toHaveBeenCalled()
  })

  it('toggles a rule and records the enablement audit action', async () => {
    dbMock.automationRule.findUnique.mockResolvedValue(mockRuleRow as never)
    dbMock.automationRule.update.mockResolvedValue({
      ...mockRuleRow,
      isEnabled: false,
    } as never)
    dbMock.auditLog.create.mockResolvedValue({ id: 'audit-3' } as never)

    const result = await toggleAutomationLifecycleRule('rule-1')

    expect(result.isEnabled).toBe(false)
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_DISABLED',
        }),
      })
    )
  })

  it('dry-runs a rule with the active family in context and records the audit entry', async () => {
    dbMock.automationRule.findUnique.mockResolvedValue(mockRuleRow as never)
    dbMock.auditLog.create.mockResolvedValue({ id: 'audit-4' } as never)
    dryRunRule.mockResolvedValue({
      wouldExecute: true,
      triggerEvaluated: true,
      conditionsEvaluated: true,
      actions: [],
      errors: [],
      warnings: [],
    })

    const result = await testAutomationLifecycleRule('rule-1', {
      memberId: 'child-1',
    })

    expect(result.wouldExecute).toBe(true)
    expect(dryRunRule).toHaveBeenCalledWith('rule-1', {
      memberId: 'child-1',
      familyId: 'family-test-123',
    })
    expect(dbMock.auditLog.create).toHaveBeenCalled()
  })

  it('lists normalized executions for the active family', async () => {
    dbMock.ruleExecution.findMany.mockResolvedValue([
      {
        id: 'exec-1',
        ruleId: 'rule-1',
        success: false,
        error: 'Action failed',
        metadata: { triggerType: 'chore_completed' },
        result: { actionsCompleted: 0, actionsFailed: 1 },
        executedAt: '2026-05-21T10:00:00.000Z',
        rule: {
          id: 'rule-1',
          name: 'Test Rule',
          familyId: 'family-test-123',
        },
      },
    ] as never)
    dbMock.ruleExecution.count.mockResolvedValue(1 as never)

    const result = await listAutomationLifecycleExecutions({
      ruleId: 'rule-1',
      limit: 50,
      offset: 0,
      success: false,
    })

    expect(result.total).toBe(1)
    expect(result.executions[0]).toEqual(
      expect.objectContaining({
        id: 'exec-1',
        success: false,
        rule: {
          id: 'rule-1',
          name: 'Test Rule',
          familyId: 'family-test-123',
        },
      })
    )
  })
})
