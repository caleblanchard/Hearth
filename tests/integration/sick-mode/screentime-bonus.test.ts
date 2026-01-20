/**
 * Integration tests for screen time bonus minutes during sick mode
 */

import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';
import { mockChildSession } from '@/lib/test-utils/auth-mock';

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));


// Mock screentime-utils
const mockCalculateRemainingTime = jest.fn();
jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: mockCalculateRemainingTime,
}));

const mockSession = mockChildSession({
  user: {
    id: 'child-1',
    familyId: 'family-1',
  },
});

describe('Screen Time Bonus - Sick Mode Integration', () => {
  beforeEach(() => {
    resetDbMock();
    jest.clearAllMocks();
  });

  describe('GET /api/screentime/stats', () => {
    it('should include sick mode bonus in balance when active', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      // Mock screen time allowances
      dbMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([
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
      mockCalculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 0,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      });

      // Mock active sick mode with 30 minute bonus
      dbMock.sickModeInstance.findFirst.mockResolvedValue({
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

      dbMock.sickModeSettings.findUnique.mockResolvedValue({
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
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(30);
      expect(data.summary.effectiveBalance).toBe(90); // 60 + 30
    });

    it('should not include bonus when sick mode is inactive', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      dbMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([
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

      mockCalculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 0,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      });

      // No active sick mode
      dbMock.sickModeInstance.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/screentime/stats');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(0);
      expect(data.summary.effectiveBalance).toBe(60); // No bonus
    });

    it('should not include bonus when bonus is 0', async () => {
      const { GET } = await import('@/app/api/screentime/stats/route');

      dbMock.screenTimeTransaction.findMany.mockResolvedValue([] as any);
      
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([
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

      mockCalculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 0,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      });

      // Active sick mode but no bonus configured
      dbMock.sickModeInstance.findFirst.mockResolvedValue({
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

      dbMock.sickModeSettings.findUnique.mockResolvedValue({
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
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.sickModeBonus).toBe(0);
      expect(data.summary.effectiveBalance).toBe(60);
    });
  });
});
