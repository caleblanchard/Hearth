import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/rules/route'

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
    listAutomationLifecycleRules: jest.fn(),
    createAutomationLifecycleRule: jest.fn(),
  }
})

const {
  AutomationRuleLifecycleError,
  listAutomationLifecycleRules: mockListAutomationLifecycleRules,
  createAutomationLifecycleRule: mockCreateAutomationLifecycleRule,
} = jest.requireMock('@/lib/data/automation-rule-lifecycle')

describe('/api/rules route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes list query params to the lifecycle module', async () => {
    mockListAutomationLifecycleRules.mockResolvedValue({
      rules: [{ id: 'rule-1', name: 'Rule One' }],
      total: 1,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/rules?enabled=true&limit=25&offset=5'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(mockListAutomationLifecycleRules).toHaveBeenCalledWith({
      enabled: true,
      limit: 25,
      offset: 5,
    })
    expect(response.status).toBe(200)
    expect(data.total).toBe(1)
  })

  it('maps lifecycle errors on GET', async () => {
    mockListAutomationLifecycleRules.mockRejectedValue(
      new AutomationRuleLifecycleError(403, 'Forbidden - Parent access required')
    )

    const response = await GET(new NextRequest('http://localhost:3000/api/rules'))
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden - Parent access required')
  })

  it('creates rules through the lifecycle module', async () => {
    mockCreateAutomationLifecycleRule.mockResolvedValue({
      id: 'rule-1',
      name: 'Rule One',
    })

    const request = new NextRequest('http://localhost:3000/api/rules', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rule One',
        trigger: { type: 'chore_completed', config: { anyChore: true } },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
        is_enabled: false,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(mockCreateAutomationLifecycleRule).toHaveBeenCalledWith({
      name: 'Rule One',
      description: undefined,
      isEnabled: false,
      trigger: { type: 'chore_completed', config: { anyChore: true } },
      conditions: null,
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
    })
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })

  it('returns 400 for invalid JSON on POST', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: 'invalid json',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
  })

  it('includes lifecycle validation details on POST failures', async () => {
    mockCreateAutomationLifecycleRule.mockRejectedValue(
      new AutomationRuleLifecycleError(400, 'Invalid trigger configuration', [
        'Invalid trigger configuration',
      ])
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Rule One',
          trigger: 'invalid',
          actions: [{ type: 'award_credits', config: { amount: 10 } }],
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid trigger configuration')
    expect(data.details).toEqual(['Invalid trigger configuration'])
  })
})
