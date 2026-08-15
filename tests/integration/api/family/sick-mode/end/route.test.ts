import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

function loadSickModeEndRoute() {
  jest.resetModules()

  class MockSickModeLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  const mockEndSickModeLifecycle = jest.fn()

  jest.doMock('@/lib/data/sick-mode-lifecycle', () => ({
    SickModeLifecycleError: MockSickModeLifecycleError,
    isSickModeLifecycleError: (error: unknown) =>
      error instanceof MockSickModeLifecycleError,
    endSickModeLifecycle: mockEndSickModeLifecycle,
  }))

  const handlers = require('@/app/api/family/sick-mode/end/route')

  return {
    ...handlers,
    MockSickModeLifecycleError,
    mockEndSickModeLifecycle,
  }
}

describe('/api/family/sick-mode/end route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates sick mode ending to Sick Mode Lifecycle', async () => {
    const { POST, mockEndSickModeLifecycle } = loadSickModeEndRoute()

    mockEndSickModeLifecycle.mockResolvedValue({
      instance: {
        id: 'instance-1',
        isActive: false,
      },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.instance.isActive).toBe(false)
    expect(mockEndSickModeLifecycle).toHaveBeenCalledWith('instance-1')
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    const {
      POST,
      MockSickModeLifecycleError,
      mockEndSickModeLifecycle,
    } = loadSickModeEndRoute()

    mockEndSickModeLifecycle.mockRejectedValue(
      new MockSickModeLifecycleError(409, 'Sick mode is already ended')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Sick mode is already ended')
  })
})
