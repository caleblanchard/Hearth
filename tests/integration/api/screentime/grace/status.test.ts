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
    getScreenTimeLifecycleGraceStatus: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  getScreenTimeLifecycleGraceStatus: mockGetScreenTimeLifecycleGraceStatus,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { GET } = require('@/app/api/screentime/grace/status/route')

describe('/api/screentime/grace/status route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates grace status reads to Screen Time Lifecycle', async () => {
    mockGetScreenTimeLifecycleGraceStatus.mockResolvedValue({
      canRequestGrace: true,
      currentBalance: 8,
      borrowedMinutes: 0,
      lowBalanceWarning: true,
      remainingDailyRequests: 1,
      remainingWeeklyRequests: 3,
      nextResetTime: '2026-05-29T00:00:00.000Z',
      settings: {
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        requiresApproval: false,
      },
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/grace/status?memberId=child-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status.canRequestGrace).toBe(true)
    expect(mockGetScreenTimeLifecycleGraceStatus).toHaveBeenCalledWith('child-1')
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetScreenTimeLifecycleGraceStatus.mockRejectedValue(
      new ScreenTimeLifecycleError(403, 'Cannot view other members status')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/grace/status?memberId=child-2')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Cannot view other members status')
  })
})
