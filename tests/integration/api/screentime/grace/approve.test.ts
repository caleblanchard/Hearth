import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screentime/grace/approve/route';

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/data/approval-request-lifecycle', () => ({
  decideGraceApprovalRequest: jest.fn(),
  isApprovalRequestLifecycleError: jest.fn(
    (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'status' in error)
  ),
}));

const { decideGraceApprovalRequest } = jest.requireMock(
  '@/lib/data/approval-request-lifecycle'
);

describe('POST /api/screentime/grace/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates grace approvals to Approval Request Lifecycle', async () => {
    decideGraceApprovalRequest.mockResolvedValue({
      graceLog: { id: 'log-1', status: 'APPROVED' },
      message: 'Grace period approved',
    });

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(decideGraceApprovalRequest).toHaveBeenCalledWith('log-1', true, {
      forbiddenMessage: 'Only parents can approve grace requests',
    });
  });

  it('maps lifecycle authorization errors', async () => {
    decideGraceApprovalRequest.mockRejectedValue({
      status: 403,
      message: 'Only parents can approve grace requests',
    });

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only parents can approve grace requests');
  });
});
