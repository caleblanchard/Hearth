/**
 * Integration tests for screen time bonus minutes during sick mode
 */

import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';
import { mockAuth } from '@/lib/test-utils/auth-mock';

// Mock NextAuth
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({ default: prismaMock }));

const mockSession = {
  user: {
    id: 'child-1',
    role: 'CHILD',
    familyId: 'family-1',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe('Screen Time Bonus - Sick Mode Integration', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    jest.resetModules();
    mockAuth.mockResolvedValue(mockSession as any);
  });

  describe('GET /api/screentime/stats', () => {
    it('should include sick mode bonus in balance when active', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      // Mock screen time allowances
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          period: 'WEEKLY',
          allowanceMinutes: 420,
          rolloverEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          screenTimeType: {
            id: 'type-1',
            name: 'General',
          },
        },
      ] as any);

      // Mock calculateRemainingTime
      jest.doMock('@/lib/screentime-utils', () => ({
        calculateRemainingTime: jest.fn().mockResolvedValue({
          remainingMinutes: 60,
          usedMinutes: 0,
          rolloverMinutes: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
        }),
      }));

      // Mock active sick mode with 30 minute bonus
      prismaMock.sickModeInstance.findFirst.mockResolvedValue({
        id: 'sick-1',
        familyId: 'family-1',
        memberId: 'child-1',
        isActive: true,
        trigger: 'MANUAL',
        startedAt: new Date(),
        endedAt: null,
        startedByMemberId: 'parent-1',
        endedByMemberId: null,
        linkedHealthEventId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-1',
        muteNonEssentialNotifs: true,
        pauseChores: true,
        skipMorningRoutine: false,
        skipBedtimeRoutine: false,
        pauseScreenTimeTracking: false,
        screenTimeBonus: 30, // 30 minute bonus
        autoEnableOnTemperature: false,
        temperatureThreshold: 100.4,
        autoDisableAfterHours: null,
        requireParentApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new Request('http://localhost/api/screentime/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(30);
      expect(data.summary.effectiveBalance).toBe(90); // 60 + 30
    });

    it('should not include bonus when sick mode is inactive', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          period: 'WEEKLY',
          allowanceMinutes: 420,
          rolloverEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          screenTimeType: {
            id: 'type-1',
            name: 'General',
          },
        },
      ] as any);

      jest.doMock('@/lib/screentime-utils', () => ({
        calculateRemainingTime: jest.fn().mockResolvedValue({
          remainingMinutes: 60,
          usedMinutes: 0,
          rolloverMinutes: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
        }),
      }));

      // No active sick mode
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/screentime/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(0);
      expect(data.summary.effectiveBalance).toBe(60); // No bonus
    });

    it('should not include bonus when bonus is 0', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          period: 'WEEKLY',
          allowanceMinutes: 420,
          rolloverEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          screenTimeType: {
            id: 'type-1',
            name: 'General',
          },
        },
      ] as any);

      jest.doMock('@/lib/screentime-utils', () => ({
        calculateRemainingTime: jest.fn().mockResolvedValue({
          remainingMinutes: 60,
          usedMinutes: 0,
          rolloverMinutes: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
        }),
      }));

      // Active sick mode but no bonus configured
      prismaMock.sickModeInstance.findFirst.mockResolvedValue({
        id: 'sick-1',
        familyId: 'family-1',
        memberId: 'child-1',
        isActive: true,
        trigger: 'MANUAL',
        startedAt: new Date(),
        endedAt: null,
        startedByMemberId: 'parent-1',
        endedByMemberId: null,
        linkedHealthEventId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-1',
        muteNonEssentialNotifs: true,
        pauseChores: true,
        skipMorningRoutine: false,
        skipBedtimeRoutine: false,
        pauseScreenTimeTracking: false,
        screenTimeBonus: 0, // No bonus
        autoEnableOnTemperature: false,
        temperatureThreshold: 100.4,
        autoDisableAfterHours: null,
        requireParentApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new Request('http://localhost/api/screentime/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(0);
      expect(data.summary.effectiveBalance).toBe(60);
    });
  });
});
