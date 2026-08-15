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
    getScreenTimeLifecycleGraceSettings: jest.fn(),
    updateScreenTimeLifecycleGraceSettings: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  getScreenTimeLifecycleGraceSettings: mockGetScreenTimeLifecycleGraceSettings,
  updateScreenTimeLifecycleGraceSettings: mockUpdateScreenTimeLifecycleGraceSettings,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { GET, PATCH, PUT } = require('@/app/api/screentime/grace/settings/route')

describe('/api/screentime/grace/settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates grace setting reads to Screen Time Lifecycle', async () => {
    mockGetScreenTimeLifecycleGraceSettings.mockResolvedValue({
      id: 'settings-1',
      memberId: 'child-1',
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/grace/settings?memberId=child-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.memberId).toBe('child-1')
    expect(mockGetScreenTimeLifecycleGraceSettings).toHaveBeenCalledWith('child-1')
  })

  it('delegates grace setting updates to Screen Time Lifecycle for PATCH', async () => {
    mockUpdateScreenTimeLifecycleGraceSettings.mockResolvedValue({
      id: 'settings-1',
      memberId: 'child-1',
      gracePeriodMinutes: 20,
      maxGracePerDay: 2,
      maxGracePerWeek: 4,
      graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
      lowBalanceWarningMinutes: 10,
      requiresApproval: true,
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/screentime/grace/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: 20,
          maxGracePerDay: 2,
          maxGracePerWeek: 4,
          requiresApproval: true,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.gracePeriodMinutes).toBe(20)
    expect(mockUpdateScreenTimeLifecycleGraceSettings).toHaveBeenCalledWith({
      memberId: 'child-1',
      gracePeriodMinutes: 20,
      maxGracePerDay: 2,
      maxGracePerWeek: 4,
      requiresApproval: true,
    })
  })

  it('supports PUT for the Grace Settings panel caller', async () => {
    mockUpdateScreenTimeLifecycleGraceSettings.mockResolvedValue({
      id: 'settings-1',
      memberId: 'child-1',
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
    })

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: 15,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockUpdateScreenTimeLifecycleGraceSettings).toHaveBeenCalled()
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetScreenTimeLifecycleGraceSettings.mockRejectedValue(
      new ScreenTimeLifecycleError(403, 'Cannot view other members settings')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/grace/settings?memberId=child-2')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Cannot view other members settings')
  })
})
