import { NextRequest } from 'next/server'
import { DELETE, GET, PATCH } from '@/app/api/rules/[id]/route'

jest.mock('@/lib/data/automation-rule-lifecycle', () => {
  class MockAutomationRuleLifecycleError extends Error {
    status: number
    details?: string[]

    constructor(status: number, message: string, details?: string[]) {
      super(message)
      this.status = status
      this.details = details
    }
  }

  return {
    AutomationRuleLifecycleError: MockAutomationRuleLifecycleError,
    isAutomationRuleLifecycleError: (error: unknown) =>
      error instanceof MockAutomationRuleLifecycleError,
    getAutomationLifecycleRule: jest.fn(),
    updateAutomationLifecycleRule: jest.fn(),
    deleteAutomationLifecycleRule: jest.fn(),
  }
})

const {
  AutomationRuleLifecycleError,
  getAutomationLifecycleRule: mockGetAutomationLifecycleRule,
  updateAutomationLifecycleRule: mockUpdateAutomationLifecycleRule,
  deleteAutomationLifecycleRule: mockDeleteAutomationLifecycleRule,
} = jest.requireMock('@/lib/data/automation-rule-lifecycle')

describe('/api/rules/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes history query params to the lifecycle module', async () => {
    mockGetAutomationLifecycleRule.mockResolvedValue({
      rule: { id: 'rule-1', name: 'Rule One' },
      executions: [],
      totalExecutions: 0,
      limit: 10,
      offset: 5,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
      },
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/rules/rule-1?limit=10&offset=5&success=true'),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(mockGetAutomationLifecycleRule).toHaveBeenCalledWith('rule-1', {
      limit: 10,
      offset: 5,
      success: true,
    })
    expect(response.status).toBe(200)
    expect(data.rule.id).toBe('rule-1')
  })

  it('normalizes update input and returns the updated rule', async () => {
    mockUpdateAutomationLifecycleRule.mockResolvedValue({
      id: 'rule-1',
      name: 'Updated Rule',
      isEnabled: false,
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Rule',
          is_enabled: false,
        }),
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(mockUpdateAutomationLifecycleRule).toHaveBeenCalledWith('rule-1', {
      name: 'Updated Rule',
      description: undefined,
      isEnabled: false,
      trigger: undefined,
      conditions: undefined,
      actions: undefined,
    })
    expect(response.status).toBe(200)
    expect(data.rule.name).toBe('Updated Rule')
  })

  it('returns 400 for invalid JSON on PATCH', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'PATCH',
        body: 'invalid json',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
  })

  it('maps lifecycle errors on DELETE', async () => {
    mockDeleteAutomationLifecycleRule.mockRejectedValue(
      new AutomationRuleLifecycleError(404, 'Rule not found')
    )

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Rule not found')
  })

  it('deletes through the lifecycle module', async () => {
    mockDeleteAutomationLifecycleRule.mockResolvedValue(undefined)

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(mockDeleteAutomationLifecycleRule).toHaveBeenCalledWith('rule-1')
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
