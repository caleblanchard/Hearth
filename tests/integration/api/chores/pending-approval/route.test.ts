import { GET } from '@/app/api/chores/pending-approval/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  listPendingChoreCompletionRequests: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}))

const { listPendingChoreCompletionRequests } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
)

describe('/api/chores/pending-approval', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates pending chore approvals to Approval Request Lifecycle', async () => {
    listPendingChoreCompletionRequests.mockResolvedValue([
      { id: 'chore-1', status: 'COMPLETED' },
    ])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.chores).toEqual([{ id: 'chore-1', status: 'COMPLETED' }])
    expect(listPendingChoreCompletionRequests).toHaveBeenCalledWith({
      forbiddenMessage: 'Forbidden - Parent access required',
    })
  })

  it('maps lifecycle authorization errors', async () => {
    listPendingChoreCompletionRequests.mockRejectedValue({
      status: 403,
      message: 'Forbidden - Parent access required',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden - Parent access required')
  })
})
