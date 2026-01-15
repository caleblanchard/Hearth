// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screentime/grace/request/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { GraceRepaymentMode, RepaymentStatus } from '@/app/generated/prisma';

describe('POST /api/screentime/grace/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test reason' }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should grant grace when eligible and no approval required', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 5,
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count.mockResolvedValue(0);
    prismaMock.gracePeriodLog.create.mockResolvedValue({
      id: 'log-1',
      memberId: session.user.id,
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: 'Test reason',
      approvedById: null,
      repaymentStatus: RepaymentStatus.PENDING,
      repaidAt: null,
      relatedTransactionId: null,
    });

    prismaMock.screenTimeTransaction.create.mockResolvedValue({
      id: 'transaction-1',
      type: 'GRACE_BORROWED' as any,
      amountMinutes: 15,
      balanceAfter: 20,
      reason: 'Grace period granted',
      createdById: session.user.id,
      createdAt: new Date(),
      deviceType: null,
      notes: null,
      screenTimeTypeId: null,
      relatedChoreInstanceId: null,
      wasOverride: false,
      overrideReason: null,
    } as any);

    prismaMock.screenTimeBalance.update.mockResolvedValue({
      ...balance,
      currentBalanceMinutes: 20,
      weekStartDate: new Date(),
    });

    prismaMock.familyMember.findUnique.mockResolvedValue({
      id: session.user.id,
      name: session.user.name || 'Test User',
      email: session.user.email || null,
      role: session.user.role as any,
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

    prismaMock.notification.create.mockResolvedValue({
      id: 'notif-1',
      type: 'GRACE_GRANTED' as any,
      title: 'Grace period granted',
      message: 'You received 15 minutes of grace time',
      userId: session.user.id,
      isRead: false,
      createdAt: new Date(),
      metadata: null,
      actionUrl: null,
      readAt: null,
    } as any);

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test reason' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.graceLog.minutesGranted).toBe(15);
    expect(data.newBalance).toBe(20);
  });

  it('should create pending request when approval required', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: true, // Approval required
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 5,
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count.mockResolvedValue(0);
    prismaMock.gracePeriodLog.create.mockResolvedValue({
      id: 'log-1',
      memberId: session.user.id,
      minutesGranted: 15,
      requestedAt: new Date(),
      reason: null,
      approvedById: null,
      repaymentStatus: RepaymentStatus.PENDING,
      repaidAt: null,
      relatedTransactionId: null,
    });

    prismaMock.familyMember.findUnique.mockResolvedValue({
      id: session.user.id,
      name: session.user.name || 'Test User',
      email: session.user.email || null,
      role: session.user.role as any,
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

    prismaMock.familyMember.findMany.mockResolvedValue([
      {
        id: 'parent-1',
        name: 'Test Parent',
        email: null,
        role: 'PARENT' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: null,
        pin: null,
        isActive: true,
        birthDate: null,
        avatarUrl: null,
        lastLoginAt: null,
      } as any,
    ]);

    prismaMock.notification.create.mockResolvedValue({
      id: 'notif-1',
      type: 'GRACE_REQUESTED' as any,
      title: 'Grace request pending',
      message: 'Test Child requested grace period',
      userId: 'parent-1',
      isRead: false,
      createdAt: new Date(),
      metadata: null,
      actionUrl: null,
      readAt: null,
    } as any);

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pendingApproval).toBe(true);
  });

  it('should return 400 when balance not low enough', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 50, // Balance is high
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test reason' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not low enough');
  });

  it('should return 400 when daily limit exceeded', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 5,
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count
      .mockResolvedValueOnce(1) // Today's count
      .mockResolvedValueOnce(1); // Week's count

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test reason' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Daily');
  });

  it('should return 400 when weekly limit exceeded', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 5,
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count
      .mockResolvedValueOnce(0) // Today's count
      .mockResolvedValueOnce(3); // Week's count

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test reason' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Weekly');
  });

  it('should handle database errors gracefully', async () => {
    const session = mockChildSession();

    prismaMock.screenTimeGraceSettings.findUnique.mockRejectedValue(
      new Error('Database error')
    );

    const request = new Request('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Test' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
