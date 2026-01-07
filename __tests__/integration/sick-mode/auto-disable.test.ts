/**
 * Integration tests for sick mode auto-disable cron job
 */

import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({ default: prismaMock }));

describe('POST /api/cron/sick-mode-auto-disable', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    jest.resetModules(); // Clear module cache between tests
  });

  it('should disable sick mode instances that have exceeded auto-disable duration', async () => {
    const { POST } = await import('@/app/api/cron/sick-mode-auto-disable/route');

    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    // Mock instance that started 25 hours ago (past 24 hour threshold)
    const expiredInstance = {
      id: 'sick-1',
      familyId: 'family-1',
      memberId: 'child-1',
      isActive: true,
      trigger: 'MANUAL',
      startedAt: twentyFiveHoursAgo,
      endedAt: null,
      startedByMemberId: 'parent-1',
      endedByMemberId: null,
      linkedHealthEventId: null,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
      member: { id: 'child-1', name: 'Child 1' },
    };

    prismaMock.sickModeSettings.findMany.mockResolvedValue([
      {
        id: 'settings-1',
        familyId: 'family-1',
        muteNonEssentialNotifs: true,
        pauseChores: true,
        skipMorningRoutine: false,
        skipBedtimeRoutine: false,
        pauseScreenTimeTracking: false,
        screenTimeBonus: 0,
        autoEnableOnTemperature: false,
        temperatureThreshold: 100.4,
        autoDisableAfterHours: 24, // 24 hour auto-disable
        requireParentApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    prismaMock.sickModeInstance.findMany.mockResolvedValue([expiredInstance] as any);

    prismaMock.sickModeInstance.update.mockResolvedValue({
      ...expiredInstance,
      isActive: false,
      endedAt: now,
    } as any);

    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/cron/sick-mode-auto-disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.disabledCount).toBe(1);
    expect(data.disabledInstances).toHaveLength(1);
    expect(data.disabledInstances[0].memberId).toBe('child-1');

    // Verify instance was disabled
    expect(prismaMock.sickModeInstance.update).toHaveBeenCalledWith({
      where: { id: 'sick-1' },
      data: {
        isActive: false,
        endedAt: expect.any(Date),
      },
    });

    // Verify audit log was created
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        familyId: 'family-1',
        memberId: expect.any(String),
        action: 'SICK_MODE_ENDED',
        entityType: 'SICK_MODE',
        entityId: 'sick-1',
        metadata: {
          reason: 'Auto-disabled after 24 hours',
          memberName: 'Child 1',
        },
      },
    });
  });

  it('should NOT disable instances within the auto-disable window', async () => {
    const { POST } = await import('@/app/api/cron/sick-mode-auto-disable/route');

    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const activeInstance = {
      id: 'sick-1',
      familyId: 'family-1',
      memberId: 'child-1',
      isActive: true,
      trigger: 'MANUAL',
      startedAt: twentyHoursAgo, // Only 20 hours ago (within 24 hour window)
      endedAt: null,
      startedByMemberId: 'parent-1',
      endedByMemberId: null,
      linkedHealthEventId: null,
      createdAt: twentyHoursAgo,
      updatedAt: twentyHoursAgo,
      member: { id: 'child-1', name: 'Child 1' },
    };

    prismaMock.sickModeSettings.findMany.mockResolvedValue([
      {
        id: 'settings-1',
        familyId: 'family-1',
        autoDisableAfterHours: 24,
      },
    ] as any);

    // The WHERE clause in the code would filter this out since startedAt is NOT less than cutoff
    // So findMany should return empty array
    prismaMock.sickModeInstance.findMany.mockResolvedValue([] as any);

    const request = new Request('http://localhost/api/cron/sick-mode-auto-disable', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.disabledCount).toBe(0);
    expect(data.disabledInstances).toHaveLength(0);
    expect(prismaMock.sickModeInstance.update).not.toHaveBeenCalled();
  });

  it('should NOT disable instances when auto-disable is not configured', async () => {
    const { POST } = await import('@/app/api/cron/sick-mode-auto-disable/route');

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const activeInstance = {
      id: 'sick-1',
      familyId: 'family-1',
      memberId: 'child-1',
      isActive: true,
      trigger: 'MANUAL',
      startedAt: fortyEightHoursAgo,
      endedAt: null,
      startedByMemberId: 'parent-1',
      endedByMemberId: null,
      linkedHealthEventId: null,
      createdAt: fortyEightHoursAgo,
      updatedAt: fortyEightHoursAgo,
      member: { id: 'child-1', name: 'Child 1' },
    };

    prismaMock.sickModeSettings.findMany.mockResolvedValue([
      {
        id: 'settings-1',
        familyId: 'family-1',
        autoDisableAfterHours: null, // Auto-disable NOT configured
      },
    ] as any);

    // Since auto-disable is null, this family won't even be queried
    prismaMock.sickModeInstance.findMany.mockResolvedValue([] as any);

    const request = new Request('http://localhost/api/cron/sick-mode-auto-disable', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.disabledCount).toBe(0);
    expect(prismaMock.sickModeInstance.update).not.toHaveBeenCalled();
  });

  it('should handle multiple families with different auto-disable settings', async () => {
    const { POST } = await import('@/app/api/cron/sick-mode-auto-disable/route');

    const now = new Date();
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);

    const family1Instance = {
      id: 'sick-1',
      familyId: 'family-1',
      memberId: 'child-1',
      isActive: true,
      trigger: 'MANUAL',
      startedAt: thirtyHoursAgo,
      endedAt: null,
      startedByMemberId: 'parent-1',
      endedByMemberId: null,
      linkedHealthEventId: null,
      createdAt: thirtyHoursAgo,
      updatedAt: thirtyHoursAgo,
      member: { id: 'child-1', name: 'Child 1' },
    };

    const family2Instance = {
      id: 'sick-2',
      familyId: 'family-2',
      memberId: 'child-2',
      isActive: true,
      trigger: 'MANUAL',
      startedAt: tenHoursAgo,
      endedAt: null,
      startedByMemberId: 'parent-2',
      endedByMemberId: null,
      linkedHealthEventId: null,
      createdAt: tenHoursAgo,
      updatedAt: tenHoursAgo,
      member: { id: 'child-2', name: 'Child 2' },
    };

    prismaMock.sickModeSettings.findMany.mockResolvedValue([
      {
        id: 'settings-1',
        familyId: 'family-1',
        autoDisableAfterHours: 24, // Should trigger (30 > 24)
      },
      {
        id: 'settings-2',
        familyId: 'family-2',
        autoDisableAfterHours: 12, // Should NOT trigger (10 < 12)
      },
    ] as any);

    // findMany will be called twice (once per family with auto-disable)
    // First call for family-1: return expired instance
    // Second call for family-2: return empty (instance not old enough)
    prismaMock.sickModeInstance.findMany
      .mockResolvedValueOnce([family1Instance] as any)  // First call (family-1)
      .mockResolvedValueOnce([] as any);  // Second call (family-2)

    prismaMock.sickModeInstance.update.mockResolvedValue({} as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/cron/sick-mode-auto-disable', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.disabledCount).toBe(1);
    expect(data.disabledInstances[0].familyId).toBe('family-1');
    
    // Only family-1 instance should be disabled
    expect(prismaMock.sickModeInstance.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.sickModeInstance.update).toHaveBeenCalledWith({
      where: { id: 'sick-1' },
      data: {
        isActive: false,
        endedAt: expect.any(Date),
      },
    });
  });

  it('should return success when no families have auto-disable configured', async () => {
    const { POST } = await import('@/app/api/cron/sick-mode-auto-disable/route');

    // No families with auto-disable configured (WHERE clause filters them out)
    prismaMock.sickModeSettings.findMany.mockResolvedValue([] as any);

    const request = new Request('http://localhost/api/cron/sick-mode-auto-disable', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.disabledCount).toBe(0);
    expect(data.disabledInstances).toHaveLength(0);
    expect(prismaMock.sickModeInstance.findMany).not.toHaveBeenCalled();
  });
});
