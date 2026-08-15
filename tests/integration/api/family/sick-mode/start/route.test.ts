import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

function loadSickModeStartRoute() {
  jest.resetModules()

  class MockSickModeLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  const mockStartSickModeLifecycle = jest.fn()

  jest.doMock('@/lib/data/sick-mode-lifecycle', () => ({
    SickModeLifecycleError: MockSickModeLifecycleError,
    isSickModeLifecycleError: (error: unknown) =>
      error instanceof MockSickModeLifecycleError,
    startSickModeLifecycle: mockStartSickModeLifecycle,
  }))

  const handlers = require('@/app/api/family/sick-mode/start/route')

  return {
    ...handlers,
    MockSickModeLifecycleError,
    mockStartSickModeLifecycle,
  }
}

describe('/api/family/sick-mode/start route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates sick mode start to Sick Mode Lifecycle', async () => {
    const { POST, mockStartSickModeLifecycle } = loadSickModeStartRoute()

    mockStartSickModeLifecycle.mockResolvedValue({
      instance: {
        id: 'instance-1',
        familyId: 'family-1',
        memberId: 'child-1',
        isActive: true,
        triggeredBy: 'MANUAL',
      },
      settings: {
        familyId: 'family-1',
      },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          notes: 'High fever',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.instance.id).toBe('instance-1')
    expect(mockStartSickModeLifecycle).toHaveBeenCalledWith({
      memberId: 'child-1',
      notes: 'High fever',
      healthEventId: undefined,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    const {
      POST,
      MockSickModeLifecycleError,
      mockStartSickModeLifecycle,
    } = loadSickModeStartRoute()

    mockStartSickModeLifecycle.mockRejectedValue(
      new MockSickModeLifecycleError(409, 'Sick mode is already active for this member')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Sick mode is already active for this member')
  })
})
