import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

function loadSickModeStatusRoute() {
  jest.resetModules()

  class MockSickModeLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  const mockListSickModeLifecycleInstances = jest.fn()

  jest.doMock('@/lib/data/sick-mode-lifecycle', () => ({
    SickModeLifecycleError: MockSickModeLifecycleError,
    isSickModeLifecycleError: (error: unknown) =>
      error instanceof MockSickModeLifecycleError,
    listSickModeLifecycleInstances: mockListSickModeLifecycleInstances,
  }))

  const handlers = require('@/app/api/family/sick-mode/status/route')

  return {
    ...handlers,
    MockSickModeLifecycleError,
    mockListSickModeLifecycleInstances,
  }
}

describe('/api/family/sick-mode/status route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates status reads to Sick Mode Lifecycle', async () => {
    const { GET, mockListSickModeLifecycleInstances } = loadSickModeStatusRoute()

    mockListSickModeLifecycleInstances.mockResolvedValue({
      instances: [
        {
          id: 'instance-1',
          memberId: 'child-1',
          isActive: true,
          member: { id: 'child-1', name: 'Alice' },
        },
      ],
    })

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/family/sick-mode/status?memberId=child-1'
      )
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.instances).toHaveLength(1)
    expect(mockListSickModeLifecycleInstances).toHaveBeenCalledWith({
      memberId: 'child-1',
      includeEnded: false,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    const {
      GET,
      MockSickModeLifecycleError,
      mockListSickModeLifecycleInstances,
    } = loadSickModeStatusRoute()

    mockListSickModeLifecycleInstances.mockRejectedValue(
      new MockSickModeLifecycleError(404, 'Member not found')
    )

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/family/sick-mode/status?memberId=missing'
      )
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Member not found')
  })
})
