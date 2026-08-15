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
    adjustScreenTimeLifecycleBalance: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  adjustScreenTimeLifecycleBalance: mockAdjustScreenTimeLifecycleBalance,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { POST } = require('@/app/api/screentime/adjust/route')

describe('/api/screentime/adjust route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates balance adjustments to Screen Time Lifecycle', async () => {
    mockAdjustScreenTimeLifecycleBalance.mockResolvedValue({
      allowanceId: 'allowance-1',
      memberId: 'child-1',
      screenTimeTypeId: 'type-1',
      amountMinutes: 10,
      previousBalance: 8,
      currentBalance: 18,
      transactionId: 'tx-1',
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
          reason: 'Good behavior',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.currentBalance).toBe(18)
    expect(mockAdjustScreenTimeLifecycleBalance).toHaveBeenCalledWith({
      memberId: 'child-1',
      screenTimeTypeId: 'type-1',
      amountMinutes: 10,
      reason: 'Good behavior',
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockAdjustScreenTimeLifecycleBalance.mockRejectedValue(
      new ScreenTimeLifecycleError(404, 'Allowance not found')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Allowance not found')
  })
})
