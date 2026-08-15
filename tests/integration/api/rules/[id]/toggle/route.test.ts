import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/rules/[id]/toggle/route'

jest.mock('@/lib/data/automation-rule-lifecycle', () => ({
  isAutomationRuleLifecycleError: (error: unknown) =>
    error instanceof Error && error.name === 'AutomationRuleLifecycleError',
  toggleAutomationLifecycleRule: jest.fn(),
}))

const {
  toggleAutomationLifecycleRule: mockToggleAutomationLifecycleRule,
} = jest.requireMock('@/lib/data/automation-rule-lifecycle')

describe('/api/rules/[id]/toggle route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('toggles through the lifecycle module', async () => {
    mockToggleAutomationLifecycleRule.mockResolvedValue({
      id: 'rule-1',
      isEnabled: false,
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(mockToggleAutomationLifecycleRule).toHaveBeenCalledWith('rule-1')
    expect(response.status).toBe(200)
    expect(data.rule.isEnabled).toBe(false)
  })

  it('maps lifecycle errors', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      status: 403,
      name: 'AutomationRuleLifecycleError',
    })
    mockToggleAutomationLifecycleRule.mockRejectedValue(error)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'rule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})
