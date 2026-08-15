import { NextRequest } from 'next/server'
import { GET } from '@/app/api/rules/executions/route'

jest.mock('@/lib/data/automation-rule-lifecycle', () => ({
  isAutomationRuleLifecycleError: (error: unknown) =>
    error instanceof Error && error.name === 'AutomationRuleLifecycleError',
  listAutomationLifecycleExecutions: jest.fn(),
}))

const {
  listAutomationLifecycleExecutions: mockListAutomationLifecycleExecutions,
} = jest.requireMock('@/lib/data/automation-rule-lifecycle')

describe('/api/rules/executions route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes execution query params to the lifecycle module', async () => {
    mockListAutomationLifecycleExecutions.mockResolvedValue({
      executions: [{ id: 'exec-1' }],
      total: 1,
      limit: 25,
      offset: 10,
    })

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/rules/executions?ruleId=rule-1&limit=25&offset=10&success=false&startDate=2026-05-01&endDate=2026-05-31'
      )
    )
    const data = await response.json()

    expect(mockListAutomationLifecycleExecutions).toHaveBeenCalledWith({
      ruleId: 'rule-1',
      limit: 25,
      offset: 10,
      success: false,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })
    expect(response.status).toBe(200)
    expect(data.total).toBe(1)
  })

  it('maps lifecycle errors', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      status: 403,
      name: 'AutomationRuleLifecycleError',
    })
    mockListAutomationLifecycleExecutions.mockRejectedValue(error)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/rules/executions')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})
