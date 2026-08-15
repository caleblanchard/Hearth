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
    getScreenTimeLifecycleAllowancesForMember: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  getScreenTimeLifecycleAllowancesForMember: mockGetScreenTimeLifecycleAllowancesForMember,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { GET } = require('@/app/api/screentime/allowances/[memberId]/route')

describe('/api/screentime/allowances/[memberId] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates member allowance reads to Screen Time Lifecycle', async () => {
    mockGetScreenTimeLifecycleAllowancesForMember.mockResolvedValue({
      member: { id: 'child-1', name: 'Child One' },
      allowances: [
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 60,
          period: 'DAILY',
          screenTimeType: { id: 'type-1', name: 'Gaming' },
          remaining: { remainingMinutes: 30 },
        },
      ],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/allowances/child-1'),
      { params: Promise.resolve({ memberId: 'child-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.member.id).toBe('child-1')
    expect(data.allowances[0].remaining.remainingMinutes).toBe(30)
    expect(mockGetScreenTimeLifecycleAllowancesForMember).toHaveBeenCalledWith('child-1')
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetScreenTimeLifecycleAllowancesForMember.mockRejectedValue(
      new ScreenTimeLifecycleError(404, 'Member not found')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/allowances/child-404'),
      { params: Promise.resolve({ memberId: 'child-404' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Member not found')
  })
})
