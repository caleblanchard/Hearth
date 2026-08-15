import { NextRequest } from 'next/server'
import { POST } from '@/app/api/chores/[id]/approve/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  approveChoreCompletionRequest: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { approveChoreCompletionRequest } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/chores/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates chore approval to Approval Request Lifecycle', async () => {
    approveChoreCompletionRequest.mockResolvedValue({
      completion: { id: 'chore-instance-1', status: 'APPROVED' },
      creditsAwarded: 10,
      message: 'Chore approved successfully',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/chores/chore-instance-1/approve', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'chore-instance-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.creditsAwarded).toBe(10)
    expect(approveChoreCompletionRequest).toHaveBeenCalledWith('chore-instance-1', {
      forbiddenMessage: 'Forbidden - Parent access required',
    })
  })

  it('maps lifecycle authorization errors', async () => {
    approveChoreCompletionRequest.mockRejectedValue({
      status: 403,
      message: 'Forbidden - Parent access required',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/chores/chore-instance-1/approve', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'chore-instance-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden - Parent access required')
  })
})
