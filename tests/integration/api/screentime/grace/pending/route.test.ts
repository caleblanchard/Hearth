import { GET } from '@/app/api/screentime/grace/pending/route';

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  listPendingGraceApprovalRequests: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}));

const { listPendingGraceApprovalRequests } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
);

describe('/api/screentime/grace/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates pending grace reads to Approval Request Lifecycle', async () => {
    listPendingGraceApprovalRequests.mockResolvedValue([
      {
        id: 'log-1',
        memberId: 'child-1',
        memberName: 'Child One',
        minutesGranted: 15,
        reason: 'Need homework time',
        requestedAt: '2026-05-19T12:00:00.000Z',
        currentBalance: 5,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(listPendingGraceApprovalRequests).toHaveBeenCalledWith({
      forbiddenMessage: 'Only parents can view pending grace requests',
    });
  });

  it('maps lifecycle authorization errors', async () => {
    listPendingGraceApprovalRequests.mockRejectedValue({
      status: 403,
      message: 'Only parents can view pending grace requests',
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only parents can view pending grace requests');
  });
});
