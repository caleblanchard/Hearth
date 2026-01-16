// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/grace/status/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { GraceRepaymentMode } from '@/app/generated/prisma';

describe('GET /api/screentime/grace/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/screentime/grace/status');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return eligibility status for current user', async () => {
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
    currentBalanceMinutes: 5, // Low balance
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count.mockResolvedValue(0); // No uses today or this week
    prismaMock.gracePeriodLog.findMany.mockResolvedValue([]); // No borrowed minutes

    const request = new Request('http://localhost/api/screentime/grace/status');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.canRequestGrace).toBe(true);
    expect(data.currentBalance).toBe(5);
    expect(data.lowBalanceWarning).toBe(true);
    expect(data.remainingDailyRequests).toBe(1);
    expect(data.remainingWeeklyRequests).toBe(3);
    expect(data.settings).toEqual(settings);
  });

  it('should count remaining daily and weekly uses', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 2,
      maxGracePerWeek: 5,
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
    // 1 use today, 3 uses this week
    prismaMock.gracePeriodLog.count
      .mockResolvedValueOnce(1) // Today
      .mockResolvedValueOnce(3); // This week
    prismaMock.gracePeriodLog.findMany.mockResolvedValue([]); // No borrowed minutes

    const request = new Request('http://localhost/api/screentime/grace/status');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.remainingDailyRequests).toBe(1); // 2 - 1 = 1
    expect(data.remainingWeeklyRequests).toBe(2); // 5 - 3 = 2
  });

  it('should show low balance warning when balance is low', async () => {
    const session = mockChildSession();

    const settings = {
      id: 'settings-1',
    memberId: session.user.id,
    gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 20, // Warning threshold
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const balance = {
      id: 'balance-1',
    memberId: session.user.id,
    currentBalanceMinutes: 15, // Below threshold
      weekStartDate: new Date(),
      weeklyAllocationMinutes: 120,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
    prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);
    prismaMock.gracePeriodLog.count.mockResolvedValue(0);
    prismaMock.gracePeriodLog.findMany.mockResolvedValue([]); // No borrowed minutes

    const request = new Request('http://localhost/api/screentime/grace/status');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.lowBalanceWarning).toBe(true);
    expect(data.canRequestGrace).toBe(true);
  });

  it('should allow parents to check child status', async () => {
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
    prismaMock.gracePeriodLog.findMany.mockResolvedValue([]); // No borrowed minutes

    const request = new Request(
      `http://localhost/api/screentime/grace/status?memberId=${childId}`
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.canRequestGrace).toBe(true);
    expect(data.currentBalance).toBe(5);
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
      `http://localhost/api/screentime/grace/status?memberId=${otherFamilyChildId}`
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Cannot view status from other families');
  });
});
