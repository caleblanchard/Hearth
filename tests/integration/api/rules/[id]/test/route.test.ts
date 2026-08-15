import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rules/[id]/test/route'

jest.mock('@/lib/data/automation-rule-lifecycle', () => {
  class MockAutomationRuleLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    AutomationRuleLifecycleError: MockAutomationRuleLifecycleError,
    testAutomationLifecycleRule: jest.fn(),
  }
})

const {
  AutomationRuleLifecycleError,
  testAutomationLifecycleRule: mockTestAutomationLifecycleRule,
} = jest.requireMock('@/lib/data/automation-rule-lifecycle')

describe('/api/rules/[id]/test route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes test context to the lifecycle module', async () => {
    mockTestAutomationLifecycleRule.mockResolvedValue({
      wouldExecute: true,
      actions: [],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
        method: 'POST',
        body: JSON.stringify({
          context: { memberId: 'child-1' },
        }),
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(mockTestAutomationLifecycleRule).toHaveBeenCalledWith('rule-1', {
      memberId: 'child-1',
    })
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 400 for invalid JSON', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
        method: 'POST',
        body: 'invalid json',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
  })

  it('maps lifecycle errors', async () => {
    mockTestAutomationLifecycleRule.mockRejectedValue(
      new AutomationRuleLifecycleError(400, 'Missing context')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing context')
  })
})
