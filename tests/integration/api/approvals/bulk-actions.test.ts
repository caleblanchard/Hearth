import { POST as BulkApprove } from '@/app/api/approvals/bulk-approve/route'
import { POST as BulkDeny } from '@/app/api/approvals/bulk-deny/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  processApprovalRequests: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { processApprovalRequests } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('bulk approval adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('validates itemIds before bulk approval', async () => {
    const response = await BulkApprove(
      new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: [] }),
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('itemIds must be a non-empty array')
    expect(processApprovalRequests).not.toHaveBeenCalled()
  })

  it('delegates bulk approval decisions to Approval Request Lifecycle', async () => {
    processApprovalRequests.mockResolvedValue({
      approved: ['chore-chore-1'],
      failed: [],
      total: 1,
    })

    const response = await BulkApprove(
      new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-1'] }),
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.approved).toEqual(['chore-chore-1'])
    expect(processApprovalRequests).toHaveBeenCalledWith({
      decision: 'APPROVE',
      itemIds: ['chore-chore-1'],
    })
  })

  it('delegates bulk deny decisions to Approval Request Lifecycle', async () => {
    processApprovalRequests.mockResolvedValue({
      approved: ['reward-reward-1'],
      failed: [],
      total: 1,
    })

    const response = await BulkDeny(
      new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['reward-reward-1'] }),
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.approved).toEqual(['reward-reward-1'])
    expect(processApprovalRequests).toHaveBeenCalledWith({
      decision: 'DENY',
      itemIds: ['reward-reward-1'],
    })
  })

  it('maps lifecycle authorization errors on bulk deny', async () => {
    processApprovalRequests.mockRejectedValue({
      status: 403,
      message: 'Only parents can deny items',
    })

    const response = await BulkDeny(
      new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['reward-reward-1'] }),
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Only parents can deny items')
  })
})
