// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screentime/grace/approve/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { RepaymentStatus } from '@/lib/enums';

describe('POST /api/screentime/grace/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if not a parent', async () => {
    const session = mockChildSession();

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('parent');
  });

  it('should return 404 if grace log not found', async () => {
    const session = mockParentSession();

    dbMock.gracePeriodLog.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  it('should return 400 if already processed', async () => {
    const session = mockParentSession();

    const processedLog = {
      id: 'log-1',
      memberId: 'child-1',
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: null,
      approvedById: session.user.id,
      repaymentStatus: RepaymentStatus.DEDUCTED, // Already processed
      repaidAt: new Date(),
      relatedTransactionId: 'transaction-1',
    };

    dbMock.gracePeriodLog.findUnique.mockResolvedValue(processedLog);

    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'child-1',
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

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already');
  });

  it('should approve and grant grace successfully', async () => {
    const session = mockParentSession();

    const pendingLog = {
      id: 'log-1',
      memberId: 'child-1',
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: 'Middle of game',
      approvedById: null,
      repaymentStatus: RepaymentStatus.PENDING,
      repaidAt: null,
      relatedTransactionId: null,
    };

    const balance = {
      id: 'balance-1',
      memberId: 'child-1',
      currentBalanceMinutes: 5,
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const settings = {
      id: 'settings-1',
      memberId: 'child-1',
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: 'DEDUCT_NEXT_WEEK' as any,
      lowBalanceWarningMinutes: 10,
      requiresApproval: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbMock.gracePeriodLog.findUnique.mockResolvedValue(pendingLog);

    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'child-1',
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

    dbMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    dbMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);

    dbMock.screenTimeTransaction.create.mockResolvedValue({
      id: 'transaction-1',
      memberId: 'child-1',
      type: 'GRACE_BORROWED' as any,
      amountMinutes: 15,
      balanceAfter: 20,
      reason: 'Grace period granted (approved by parent)',
      createdById: session.user.id,
      createdAt: new Date(),
      deviceType: null,
      notes: null,
      screenTimeTypeId: null,
      relatedChoreInstanceId: null,
      wasOverride: false,
      overrideReason: null,
    } as any);

    dbMock.screenTimeBalance.update.mockResolvedValue({
      ...balance,
      currentBalanceMinutes: 20,
      weekStartDate: new Date(),
    });

    dbMock.gracePeriodLog.update.mockResolvedValue({
      ...pendingLog,
      approvedById: session.user.id,
    });

    dbMock.notification.create.mockResolvedValue({
      id: 'notif-1',
      type: 'GRACE_APPROVED' as any,
      title: 'Grace request approved',
      message: 'Your grace period request was approved',
      userId: 'child-1',
      isRead: false,
      createdAt: new Date(),
      metadata: null,
      actionUrl: null,
      readAt: null,
    } as any);

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(true);

    // Verify transaction created
    expect(dbMock.screenTimeTransaction.create).toHaveBeenCalled();

    // Verify balance updated
    expect(dbMock.screenTimeBalance.update).toHaveBeenCalled();

    // Verify grace log updated
    expect(dbMock.gracePeriodLog.update).toHaveBeenCalled();

    // Verify child notified
    expect(dbMock.notification.create).toHaveBeenCalled();
  });

  it('should deny request and update status', async () => {
    const session = mockParentSession();

    const pendingLog = {
      id: 'log-1',
      memberId: 'child-1',
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: 'Middle of game',
      approvedById: null,
      repaymentStatus: RepaymentStatus.PENDING,
      repaidAt: null,
      relatedTransactionId: null,
    };

    dbMock.gracePeriodLog.findUnique.mockResolvedValue(pendingLog);

    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'child-1',
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

    dbMock.gracePeriodLog.update.mockResolvedValue({
      ...pendingLog,
      approvedById: session.user.id,
      repaymentStatus: RepaymentStatus.FORGIVEN, // Denied logs are marked as forgiven
    });

    dbMock.notification.create.mockResolvedValue({
      id: 'notif-1',
      type: 'GRACE_DENIED' as any,
      title: 'Grace request denied',
      message: 'Your grace period request was denied',
      userId: 'child-1',
      isRead: false,
      createdAt: new Date(),
      metadata: null,
      actionUrl: null,
      readAt: null,
    } as any);

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: false }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(false);

    // Verify NO transaction created
    expect(dbMock.screenTimeTransaction.create).not.toHaveBeenCalled();

    // Verify NO balance update
    expect(dbMock.screenTimeBalance.update).not.toHaveBeenCalled();

    // Verify grace log updated with denial
    expect(dbMock.gracePeriodLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: {
        approvedById: session.user.id,
        repaymentStatus: RepaymentStatus.FORGIVEN,
      },
    });

    // Verify child notified of denial
    expect(dbMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining('denied'),
        }),
      })
    );
  });

  it('should verify family ownership', async () => {
    const session = mockParentSession();

    const pendingLog = {
      id: 'log-1',
      memberId: 'child-1',
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: null,
      approvedById: null,
      repaymentStatus: RepaymentStatus.PENDING,
      repaidAt: null,
      relatedTransactionId: null,
    };

    dbMock.gracePeriodLog.findUnique.mockResolvedValue(pendingLog);

    // Child is in different family
    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'child-1',
      name: 'Test Child',
      email: null,
      role: 'CHILD' as any,
      familyId: 'different-family-id', // Different family
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: null,
      pin: null,
      isActive: true,
      birthDate: null,
      avatarUrl: null,
      lastLoginAt: null,
    } as any);

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Cannot approve grace requests from other families');
  });

  it('should handle database errors gracefully', async () => {
    const session = mockParentSession();

    dbMock.gracePeriodLog.findUnique.mockRejectedValue(
      new Error('Database error')
    );

    const request = new Request('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
