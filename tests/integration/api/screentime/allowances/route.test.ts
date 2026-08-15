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
    listScreenTimeLifecycleAllowances: jest.fn(),
    saveScreenTimeLifecycleAllowance: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  listScreenTimeLifecycleAllowances: mockListScreenTimeLifecycleAllowances,
  saveScreenTimeLifecycleAllowance: mockSaveScreenTimeLifecycleAllowance,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { GET, POST } = require('@/app/api/screentime/allowances/route')

describe('/api/screentime/allowances route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates allowance reads to Screen Time Lifecycle', async () => {
    mockListScreenTimeLifecycleAllowances.mockResolvedValue({
      allowances: [
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'DAILY',
        },
      ],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/allowances?screenTimeTypeId=type-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.allowances).toHaveLength(1)
    expect(mockListScreenTimeLifecycleAllowances).toHaveBeenCalledWith({
      memberId: null,
      screenTimeTypeId: 'type-1',
    })
  })

  it('delegates allowance saves to Screen Time Lifecycle', async () => {
    mockSaveScreenTimeLifecycleAllowance.mockResolvedValue({
      id: 'allowance-1',
      memberId: 'child-1',
      screenTimeTypeId: 'type-1',
      allowanceMinutes: 60,
      period: 'DAILY',
      rolloverEnabled: false,
      rolloverCapMinutes: null,
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 60,
          period: 'DAILY',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSaveScreenTimeLifecycleAllowance).toHaveBeenCalledWith({
      memberId: 'child-1',
      screenTimeTypeId: 'type-1',
      allowanceMinutes: 60,
      period: 'DAILY',
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockListScreenTimeLifecycleAllowances.mockRejectedValue(
      new ScreenTimeLifecycleError(403, 'Parent access required')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/allowances')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Parent access required')
  })
})
