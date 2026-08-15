import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/screen-time-lifecycle', () => {
  class MockScreenTimeLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ScreenTimeLifecycleError: MockScreenTimeLifecycleError,
    isScreenTimeLifecycleError: (error: unknown) =>
      error instanceof MockScreenTimeLifecycleError,
    requestScreenTimeLifecycleGrace: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  requestScreenTimeLifecycleGrace: mockRequestScreenTimeLifecycleGrace,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { POST } = require('@/app/api/screentime/grace/request/route')

describe('/api/screentime/grace/request route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates grace requests to Screen Time Lifecycle', async () => {
    mockRequestScreenTimeLifecycleGrace.mockResolvedValue({
      pendingApproval: false,
      newBalance: 20,
      graceLog: {
        id: 'log-1',
        minutesGranted: 15,
      },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/grace/request', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Middle of a game' }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.newBalance).toBe(20)
    expect(mockRequestScreenTimeLifecycleGrace).toHaveBeenCalledWith({
      reason: 'Middle of a game',
      allowanceId: undefined,
      minutes: undefined,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockRequestScreenTimeLifecycleGrace.mockRejectedValue(
      new ScreenTimeLifecycleError(400, 'Daily grace limit exceeded')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/grace/request', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Too many requests' }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Daily grace limit exceeded')
  })
})
