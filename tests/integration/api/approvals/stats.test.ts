// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { GET } from '@/app/api/approvals/stats/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/approvals/stats', () => {
  beforeEach(() => {
    resetDbMock();
    jest.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject child users', async () => {

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only parents can view approval statistics');
  });

  it('should return stats when no pending approvals exist', async () => {

    dbMock.choreInstance.count.mockResolvedValueOnce(0);
    dbMock.rewardRedemption.count.mockResolvedValueOnce(0);
    dbMock.choreInstance.findFirst.mockResolvedValueOnce(null);
    dbMock.rewardRedemption.findFirst.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      total: 0,
      byType: {
        choreCompletions: 0,
        rewardRedemptions: 0,
        shoppingRequests: 0,
        calendarRequests: 0
      },
      byPriority: {
        high: 0,
        normal: 0,
        low: 0
      },
      oldestPending: undefined
    });
  });

  it('should return correct counts for chores and rewards', async () => {

    dbMock.choreInstance.count.mockResolvedValue(5);
    dbMock.rewardRedemption.count.mockResolvedValue(3);
    dbMock.choreInstance.findFirst.mockResolvedValue({
      id: 'chore-1',
      completedAt: new Date('2024-01-05T10:00:00Z')
    } as any);
    dbMock.rewardRedemption.findFirst.mockResolvedValue({
      id: 'reward-1',
      requestedAt: new Date('2024-01-06T12:00:00Z')
    } as any);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(8);
    expect(data.byType.choreCompletions).toBe(5);
    expect(data.byType.rewardRedemptions).toBe(3);
    expect(data.byType.shoppingRequests).toBe(0);
    expect(data.byType.calendarRequests).toBe(0);
  });

  it('should return oldest pending chore when it is older than oldest reward', async () => {

    const oldChore = {
      completedAt: new Date('2024-01-01T10:00:00Z')
    };

    dbMock.choreInstance.count.mockResolvedValue(2);
    dbMock.rewardRedemption.count.mockResolvedValue(1);
    dbMock.choreInstance.findFirst.mockResolvedValue(oldChore as any);
    dbMock.rewardRedemption.findFirst.mockResolvedValue({
      requestedAt: new Date('2024-01-03T12:00:00Z')
    } as any);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(3);
    expect(new Date(data.oldestPending).toISOString()).toEqual('2024-01-01T10:00:00.000Z');
  });

  it('should return oldest pending reward when it is older than oldest chore', async () => {

    const oldReward = {
      requestedAt: new Date('2024-01-01T08:00:00Z')
    };

    dbMock.choreInstance.count.mockResolvedValue(1);
    dbMock.rewardRedemption.count.mockResolvedValue(2);
    dbMock.choreInstance.findFirst.mockResolvedValue({
      completedAt: new Date('2024-01-02T10:00:00Z')
    } as any);
    dbMock.rewardRedemption.findFirst.mockResolvedValue(oldReward as any);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(3);
    expect(new Date(data.oldestPending).toISOString()).toEqual('2024-01-01T08:00:00.000Z');
  });

  it('should enforce family isolation for chore counts', async () => {
    const session = mockParentSession();

    dbMock.choreInstance.count.mockResolvedValue(3);
    dbMock.rewardRedemption.count.mockResolvedValue(0);
    dbMock.choreInstance.findFirst.mockResolvedValue(null);
    dbMock.rewardRedemption.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(3);

    // Just verify the count was called - we're testing family isolation in route.test.ts
    expect(dbMock.choreInstance.count).toHaveBeenCalled();
  });

  it('should enforce family isolation for reward counts', async () => {
    const session = mockParentSession();

    dbMock.choreInstance.count.mockResolvedValue(0);
    dbMock.rewardRedemption.count.mockResolvedValue(2);
    dbMock.choreInstance.findFirst.mockResolvedValue(null);
    dbMock.rewardRedemption.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/approvals/stats');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(2);

    // Just verify the count was called - we're testing family isolation in route.test.ts
    expect(dbMock.rewardRedemption.count).toHaveBeenCalled();
  });
});
