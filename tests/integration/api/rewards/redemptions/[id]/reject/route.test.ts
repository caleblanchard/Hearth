import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rewards/redemptions/[id]/reject/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  rejectRewardRedemptionRequest: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { rejectRewardRedemptionRequest } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/rewards/redemptions/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates reward rejection to Approval Request Lifecycle', async () => {
    rejectRewardRedemptionRequest.mockResolvedValue({
      redemption: { id: 'redemption-1', status: 'REJECTED' },
      message: 'Redemption rejected successfully',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/rewards/redemptions/redemption-1/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Out of stock' }),
      }),
      { params: Promise.resolve({ id: 'redemption-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(rejectRewardRedemptionRequest).toHaveBeenCalledWith(
      'redemption-1',
      'Out of stock',
      { forbiddenMessage: 'Forbidden' }
    )
  })

  it('maps lifecycle 400 errors', async () => {
    rejectRewardRedemptionRequest.mockRejectedValue({
      status: 400,
      message: 'This redemption has already been processed',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/rewards/redemptions/redemption-1/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'redemption-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('This redemption has already been processed')
  })
})
