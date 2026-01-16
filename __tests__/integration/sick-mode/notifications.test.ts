/**
 * Integration tests for notification muting during sick mode
 * Tests that non-essential notifications are muted when sick mode is active
 */

import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';
import { mockParentSession } from '@/lib/test-utils/auth-mock';
import { createNotification } from '@/lib/notifications';

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({ default: prismaMock }));

const mockSession = mockParentSession({
  user: {
    id: 'parent-1',
    familyId: 'family-1',
  },
});

describe('Notification Muting - Sick Mode Integration', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('Non-Essential Notifications', () => {
    const nonEssentialTypes = [
      'CHORE_COMPLETED',
      'CHORE_ASSIGNED',
      'CREDITS_EARNED',
      'SCREENTIME_ADJUSTED',
      'SCREENTIME_LOW',
      'TODO_ASSIGNED',
      'SHOPPING_REQUEST',
      'ROUTINE_TIME',
      'GENERAL',
    ];

    nonEssentialTypes.forEach((type) => {
      it(`should NOT create ${type} notification when sick mode is active with muting enabled`, async () => {
        // Mock active sick mode with muting enabled
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
          screenTimeBonus: 0,
          autoEnableOnTemperature: false,
          temperatureThreshold: 100.4,
          autoDisableAfterHours: null,
          requireParentApproval: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        const result = await createNotification({
          userId: 'child-1',
          familyId: 'family-1',
          type: type as any,
          title: 'Test',
          message: 'Test message',
        });

        // Should return null (not created) due to muting
        expect(result).toBeNull();
        expect(prismaMock.notification.create).not.toHaveBeenCalled();
      });

      it(`should create ${type} notification when sick mode is active but muting disabled`, async () => {
        // Mock active sick mode with muting DISABLED
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
          muteNonEssentialNotifs: false, // DISABLED
          pauseChores: true,
          skipMorningRoutine: false,
          skipBedtimeRoutine: false,
          pauseScreenTimeTracking: false,
          screenTimeBonus: 0,
          autoEnableOnTemperature: false,
          temperatureThreshold: 100.4,
          autoDisableAfterHours: null,
          requireParentApproval: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        const mockNotification = {
          id: 'notif-1',
          userId: 'child-1',
          type,
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        };

        prismaMock.notification.create.mockResolvedValue(mockNotification as any);

        const result = await createNotification({
          userId: 'child-1',
          familyId: 'family-1',
          type: type as any,
          title: 'Test',
          message: 'Test message',
        });

        expect(result).toEqual(mockNotification);
        expect(prismaMock.notification.create).toHaveBeenCalled();
      });
    });
  });

  describe('Essential Notifications (Never Muted)', () => {
    const essentialTypes = [
      'MEDICATION_AVAILABLE',
      'MAINTENANCE_DUE',
      'LEFTOVER_EXPIRING',
      'DOCUMENT_EXPIRING',
      'REWARD_APPROVED',
      'REWARD_REJECTED',
      'CHORE_APPROVED',
      'CHORE_REJECTED',
    ];

    essentialTypes.forEach((type) => {
      it(`should ALWAYS create ${type} notification even when sick mode muting is active`, async () => {
        // Mock active sick mode with muting enabled
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
          muteNonEssentialNotifs: true, // ENABLED
          pauseChores: true,
          skipMorningRoutine: false,
          skipBedtimeRoutine: false,
          pauseScreenTimeTracking: false,
          screenTimeBonus: 0,
          autoEnableOnTemperature: false,
          temperatureThreshold: 100.4,
          autoDisableAfterHours: null,
          requireParentApproval: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        const mockNotification = {
          id: 'notif-1',
          userId: 'child-1',
          type,
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        };

        prismaMock.notification.create.mockResolvedValue(mockNotification as any);

        const result = await createNotification({
          userId: 'child-1',
          familyId: 'family-1',
          type: type as any,
          title: 'Test',
          message: 'Test message',
        });

        // Essential notifications should ALWAYS be created
        expect(result).toEqual(mockNotification);
        expect(prismaMock.notification.create).toHaveBeenCalled();
      });
    });
  });

  it('should create notification when user is NOT in sick mode', async () => {
    // No active sick mode
    prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);

    const mockNotification = {
      id: 'notif-1',
      userId: 'child-1',
      type: 'CHORE_COMPLETED',
      title: 'Test',
      message: 'Test message',
      isRead: false,
      createdAt: new Date(),
    };

    prismaMock.notification.create.mockResolvedValue(mockNotification as any);

    const result = await createNotification({
      userId: 'child-1',
      familyId: 'family-1',
      type: 'CHORE_COMPLETED',
      title: 'Test',
      message: 'Test message',
    });

    expect(result).toEqual(mockNotification);
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  it('should get family member info to check sick mode', async () => {
    // User not found, should still create notification
    prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);

    const mockNotification = {
      id: 'notif-1',
      userId: 'child-1',
      type: 'CHORE_COMPLETED',
      title: 'Test',
      message: 'Test message',
      isRead: false,
      createdAt: new Date(),
    };

    prismaMock.notification.create.mockResolvedValue(mockNotification as any);

    const result = await createNotification({
      userId: 'child-1',
      familyId: 'family-1',
      type: 'CHORE_COMPLETED',
      title: 'Test',
      message: 'Test message',
    });

    expect(prismaMock.sickModeInstance.findFirst).toHaveBeenCalledWith({
      where: {
        memberId: 'child-1',
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    expect(result).toEqual(mockNotification);
  });
});
