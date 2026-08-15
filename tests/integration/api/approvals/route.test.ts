import { NextRequest } from 'next/server'
import { GET } from '@/app/api/approvals/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  listApprovalRequests: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { listApprovalRequests } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/approvals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates queue reads to Approval Request Lifecycle with parsed filters', async () => {
    listApprovalRequests.mockResolvedValue({
      approvals: [
        {
          id: 'chore-chore-1',
          type: 'CHORE_COMPLETION',
          familyMemberId: 'child-1',
          familyMemberName: 'Alice Example',
          familyMemberAvatarUrl: null,
          title: 'Clean room',
          description: '',
          requestedAt: '2026-05-19T12:00:00.000Z',
          metadata: { credits: 10 },
          priority: 'NORMAL',
          actionable: true,
        },
      ],
      total: 1,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/approvals?type=CHORE_COMPLETION&memberId=child-1'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(1)
    expect(listApprovalRequests).toHaveBeenCalledWith({
      type: 'CHORE_COMPLETION',
      memberId: 'child-1',
    })
  })

  it('maps lifecycle authorization errors to HTTP responses', async () => {
    listApprovalRequests.mockRejectedValue({
      status: 403,
      message: 'Only parents can view the approval queue',
    })

    const request = new NextRequest('http://localhost:3000/api/approvals')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Only parents can view the approval queue')
  })
})
