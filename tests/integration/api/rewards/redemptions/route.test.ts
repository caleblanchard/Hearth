import { GET } from '@/app/api/rewards/redemptions/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  listPendingRewardRedemptionRequests: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { listPendingRewardRedemptionRequests } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/rewards/redemptions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates pending reward reads to Approval Request Lifecycle', async () => {
    listPendingRewardRedemptionRequests.mockResolvedValue([
      {
        id: 'redemption-1',
        status: 'PENDING',
        requestedAt: '2026-05-19T12:00:00.000Z',
        reward: { id: 'reward-1', name: 'Ice Cream', costCredits: 25, category: 'FUN' },
        member: { id: 'child-1', name: 'Child One', avatarUrl: null },
      },
    ])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.redemptions).toHaveLength(1)
    expect(listPendingRewardRedemptionRequests).toHaveBeenCalledWith({
      forbiddenMessage: 'Forbidden',
    })
  })

  it('maps lifecycle authorization errors', async () => {
    listPendingRewardRedemptionRequests.mockRejectedValue({
      status: 403,
      message: 'Forbidden',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})
