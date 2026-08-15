import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rewards/redemptions/[id]/approve/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  approveRewardRedemptionRequest: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { approveRewardRedemptionRequest } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/rewards/redemptions/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates reward approval to Approval Request Lifecycle', async () => {
    approveRewardRedemptionRequest.mockResolvedValue({
      redemption: { id: 'redemption-1', status: 'APPROVED' },
      message: 'Approved Child One\'s redemption of "Test Reward"',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/rewards/redemptions/redemption-1/approve', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'redemption-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(approveRewardRedemptionRequest).toHaveBeenCalledWith('redemption-1', {
      forbiddenMessage: 'Forbidden',
    })
  })

  it('maps lifecycle 404 errors', async () => {
    approveRewardRedemptionRequest.mockRejectedValue({
      status: 404,
      message: 'Redemption not found',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/rewards/redemptions/redemption-1/approve', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'redemption-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Redemption not found')
  })
})
