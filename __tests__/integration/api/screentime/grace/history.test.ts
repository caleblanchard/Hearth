// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/grace/history/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { RepaymentStatus } from '@/app/generated/prisma';

describe('GET /api/screentime/grace/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/screentime/grace/history');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return history for current user', async () => {
    const session = mockChildSession();

    const logs = [
      {
        id: 'log-1',
        minutesGranted: 15,
        requestedAt: new Date('2025-01-01'),
        reason: 'Middle of game',
        approvedById: 'parent-1',
        repaymentStatus: RepaymentStatus.PENDING,
        repaidAt: null,
        relatedTransactionId: null,
        approvedBy: {
          id: 'parent-1',
          name: 'Test Parent',
        },
      },
      {
        id: 'log-2',
        minutesGranted: 10,
        requestedAt: new Date('2025-01-02'),
        reason: null,
        approvedById: null,
        repaymentStatus: RepaymentStatus.DEDUCTED,
        repaidAt: new Date('2025-01-03'),
        relatedTransactionId: 'transaction-1',
        approvedBy: null,
      },
    ];

    prismaMock.gracePeriodLog.findMany.mockResolvedValue(logs as any);
    prismaMock.gracePeriodLog.count.mockResolvedValue(2);

    const request = new Request('http://localhost/api/screentime/grace/history');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs).toEqual(logs);
    expect(data.pagination.total).toBe(2);
  });

  it('should allow parents to view child history', async () => {
    const session = mockParentSession();

    const childId = 'child-1';

    // Mock member check
    prismaMock.familyMember.findUnique.mockResolvedValue({
      id: childId,
      name: 'Test Child',
      email: null,
      role: 'CHILD' as any,
      familyId: session.user.familyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: null,
      pin: null,
      isActive: true,
      birthDate: null,
      avatarUrl: null,
      lastLoginAt: null,
    } as any);

    const logs = [
      {
        id: 'log-1',
        memberId: childId,
        minutesGranted: 15,
        requestedAt: new Date('2025-01-01'),
        reason: 'Test',
        approvedById: session.user.id,
        repaymentStatus: RepaymentStatus.PENDING,
        repaidAt: null,
        relatedTransactionId: null,
        approvedBy: {
          id: session.user.id,
          name: session.user.name,
        },
      },
    ];

    prismaMock.gracePeriodLog.findMany.mockResolvedValue(logs as any);
    prismaMock.gracePeriodLog.count.mockResolvedValue(1);

    const request = new Request(
      `http://localhost/api/screentime/grace/history?memberId=${childId}`
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs).toEqual(logs);
  });

  it('should support pagination', async () => {
    const session = mockChildSession();

    const logs = [
      {
        id: 'log-3',
        minutesGranted: 15,
        requestedAt: new Date('2025-01-03'),
        reason: null,
        approvedById: null,
        repaymentStatus: RepaymentStatus.PENDING,
        repaidAt: null,
        relatedTransactionId: null,
        approvedBy: null,
      },
    ];

    prismaMock.gracePeriodLog.findMany.mockResolvedValue(logs as any);
    prismaMock.gracePeriodLog.count.mockResolvedValue(10);

    const request = new Request(
      'http://localhost/api/screentime/grace/history?limit=1&offset=2'
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs).toEqual(logs);
    expect(data.pagination.total).toBe(10);
    expect(data.pagination.hasMore).toBe(true);

    // Verify pagination params were used
    expect(prismaMock.gracePeriodLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
        skip: 2,
      })
    );
  });

  it('should include approver information', async () => {
    const session = mockChildSession();

    const logs = [
      {
        id: 'log-1',
        minutesGranted: 15,
        requestedAt: new Date('2025-01-01'),
        reason: 'Test',
        approvedById: 'parent-1',
        repaymentStatus: RepaymentStatus.PENDING,
        repaidAt: null,
        relatedTransactionId: null,
        approvedBy: {
          id: 'parent-1',
          name: 'Test Parent',
        },
      },
    ];

    prismaMock.gracePeriodLog.findMany.mockResolvedValue(logs as any);
    prismaMock.gracePeriodLog.count.mockResolvedValue(1);

    const request = new Request('http://localhost/api/screentime/grace/history');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs[0].approvedBy).toEqual({
      id: 'parent-1',
      name: 'Test Parent',
    });

    // Verify approver info was included in query
    expect(prismaMock.gracePeriodLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          approvedBy: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              name: true,
            }),
          }),
        }),
      })
    );
  });

  it('should verify family ownership', async () => {
    const session = mockParentSession();

    const otherFamilyChildId = 'other-family-child';

    // Mock member from different family
    prismaMock.familyMember.findUnique.mockResolvedValue({
      id: otherFamilyChildId,
      name: 'Other Family Child',
      email: null,
      role: 'CHILD' as any,
      familyId: 'different-family',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: null,
      pin: null,
      isActive: true,
      birthDate: null,
      avatarUrl: null,
      lastLoginAt: null,
    } as any);

    const request = new Request(
      `http://localhost/api/screentime/grace/history?memberId=${otherFamilyChildId}`
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Cannot view history from other families');
  });
});
