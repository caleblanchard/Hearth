import { GET } from '@/app/api/approvals/stats/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  getApprovalRequestStats: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { getApprovalRequestStats } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('GET /api/approvals/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates approval stats to Approval Request Lifecycle', async () => {
    getApprovalRequestStats.mockResolvedValue({
      total: 3,
      byType: {
        choreCompletions: 1,
        rewardRedemptions: 1,
        shoppingRequests: 1,
      },
      byPriority: {
        high: 1,
        normal: 2,
        low: 0,
      },
      oldestPending: '2026-05-19T12:00:00.000Z',
    })

    const response = await GET(new Request('http://localhost/api/approvals/stats') as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(3)
    expect(getApprovalRequestStats).toHaveBeenCalledWith()
  })

  it('maps lifecycle authorization errors', async () => {
    getApprovalRequestStats.mockRejectedValue({
      status: 403,
      message: 'Only parents can view approval statistics',
    })

    const response = await GET(new Request('http://localhost/api/approvals/stats') as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Only parents can view approval statistics')
  })
})
