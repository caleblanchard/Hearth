import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';
import bcrypt from 'bcrypt';
import {
  createKioskSession,
  getKioskSession,
  updateKioskActivity,
  lockKioskSession,
  unlockKioskSession,
  endKioskSession,
  checkAutoLock,
  getOrCreateKioskSettings,
} from '@/lib/kiosk-session';

describe('Kiosk Session Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  describe('createKioskSession', () => {
    it('should create a new kiosk session', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(null);
      dbMock.kioskSession.create.mockResolvedValue(mockSession);

      const result = await createKioskSession('device-123', 'family-1');

      expect(result).toEqual(mockSession);
      expect(dbMock.kioskSession.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-1',
          deviceId: 'device-123',
          currentMemberId: null,
          lastActivityAt: expect.any(Date),
        },
      });
    });

    it('should reactivate existing active session for same device', async () => {
      const existingSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(Date.now() - 100000),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSession = {
        ...existingSession,
        currentMemberId: null,
        lastActivityAt: new Date(),
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(existingSession);
      dbMock.kioskSession.update.mockResolvedValue(updatedSession);

      const result = await createKioskSession('device-123', 'family-1');

      expect(result.current_member_id).toBeNull();
      expect(dbMock.kioskSession.update).toHaveBeenCalled();
      expect(dbMock.kioskSession.create).not.toHaveBeenCalled();
    });

    it('should start session in locked state (currentMemberId null)', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(null);
      dbMock.kioskSession.create.mockResolvedValue(mockSession);

      const result = await createKioskSession('device-123', 'family-1');

      expect(result.current_member_id).toBeNull();
    });
  });

  describe('getKioskSession', () => {
    it('should retrieve session by token', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentMember: {
          id: 'member-1',
          name: 'Test Child',
          role: 'CHILD' as const,
          avatarUrl: null,
        },
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);

      const result = await getKioskSession('token-123');

      expect(result).toEqual(mockSession);
      expect(dbMock.kioskSession.findUnique).toHaveBeenCalledWith({
        where: { sessionToken: 'token-123' },
        include: {
          currentMember: {
            select: {
              id: true,
              name: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent session', async () => {
      dbMock.kioskSession.findUnique.mockResolvedValue(null);

      const result = await getKioskSession('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('updateKioskActivity', () => {
    it('should update lastActivityAt timestamp', async () => {
      const oldTime = new Date(Date.now() - 60000);
      const newTime = new Date();

      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: newTime,
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.update.mockResolvedValue(mockSession);

      const result = await updateKioskActivity('token-123');

      expect(new Date(result.last_activity_at).getTime()).toBeGreaterThan(oldTime.getTime());
      expect(dbMock.kioskSession.update).toHaveBeenCalledWith({
        where: { sessionToken: 'token-123' },
        data: {
          lastActivityAt: expect.any(Date),
        },
      });
    });
  });

  describe('lockKioskSession', () => {
    it('should clear currentMemberId', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.update.mockResolvedValue(mockSession);

      const result = await lockKioskSession('token-123');

      expect(result.current_member_id).toBeNull();
      expect(dbMock.kioskSession.update).toHaveBeenCalledWith({
        where: { sessionToken: 'token-123' },
        data: {
          currentMemberId: null,
        },
      });
    });
  });

  describe('unlockKioskSession', () => {
    it('should unlock with valid PIN', async () => {
      const hashedPin = await bcrypt.hash('1234', 10);

      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        id: 'member-1',
        familyId: 'family-1',
        name: 'Test Child',
        email: null,
        passwordHash: null,
        pin: hashedPin,
        role: 'CHILD' as const,
        birthDate: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const updatedSession = {
        ...mockSession,
        currentMemberId: 'member-1',
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember);
      dbMock.kioskSession.update.mockResolvedValue(updatedSession);

      const result = await unlockKioskSession('token-123', 'member-1', '1234');

      expect(result.success).toBe(true);
      expect(result.session?.currentMemberId).toBe('member-1');
    });

    it('should reject invalid PIN', async () => {
      const hashedPin = await bcrypt.hash('1234', 10);

      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        id: 'member-1',
        familyId: 'family-1',
        name: 'Test Child',
        email: null,
        passwordHash: null,
        pin: hashedPin,
        role: 'CHILD' as const,
        birthDate: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember);

      const result = await unlockKioskSession('token-123', 'member-1', '9999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid PIN');
    });

    it('should reject member from different family', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        id: 'member-1',
        familyId: 'family-2', // Different family!
        name: 'Test Child',
        email: null,
        passwordHash: null,
        pin: 'hashed',
        role: 'CHILD' as const,
        birthDate: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember);

      const result = await unlockKioskSession('token-123', 'member-1', '1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not in session family');
    });

    it('should reject member without PIN set', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        id: 'member-1',
        familyId: 'family-1',
        name: 'Test Child',
        email: null,
        passwordHash: null,
        pin: null, // No PIN set
        role: 'CHILD' as const,
        birthDate: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember);

      const result = await unlockKioskSession('token-123', 'member-1', '1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member has no PIN set');
    });

    it('should return error for non-existent session', async () => {
      dbMock.kioskSession.findUnique.mockResolvedValue(null);

      const result = await unlockKioskSession('invalid-token', 'member-1', '1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should return error for non-existent member', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      dbMock.familyMember.findUnique.mockResolvedValue(null);

      const result = await unlockKioskSession('token-123', 'invalid-member', '1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
    });
  });

  describe('endKioskSession', () => {
    it('should set isActive to false and clear currentMemberId', async () => {
      const mockSession = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: false,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSession.update.mockResolvedValue(mockSession);

      const result = await endKioskSession('token-123');

      expect(result.is_active).toBe(false);
      expect(result.current_member_id).toBeNull();
      expect(dbMock.kioskSession.update).toHaveBeenCalledWith({
        where: { sessionToken: 'token-123' },
        data: {
          isActive: false,
          currentMemberId: null,
        },
      });
    });
  });

  describe('checkAutoLock', () => {
    it('should return true when timeout exceeded', () => {
      const session = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = checkAutoLock(session);

      expect(result).toBe(true);
    });

    it('should return false when timeout not exceeded', () => {
      const session = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = checkAutoLock(session);

      expect(result).toBe(false);
    });

    it('should handle edge case when exactly at timeout', () => {
      const autoLockMinutes = 15;
      const session = {
        id: 'session-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(Date.now() - autoLockMinutes * 60 * 1000),
        autoLockMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = checkAutoLock(session);

      expect(result).toBe(true);
    });
  });

  describe('getOrCreateKioskSettings', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        familyId: 'family-1',
        isEnabled: true,
        autoLockMinutes: 20,
        enabledWidgets: ['transport', 'medication'],
        allowGuestView: false,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await getOrCreateKioskSettings('family-1');

      expect(result).toEqual(mockSettings);
      expect(dbMock.kioskSettings.create).not.toHaveBeenCalled();
    });

    it('should create default settings if none exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        familyId: 'family-1',
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
        allowGuestView: true,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.kioskSettings.findUnique.mockResolvedValue(null);
      dbMock.kioskSettings.create.mockResolvedValue(mockSettings);

      const result = await getOrCreateKioskSettings('family-1');

      expect(result.is_enabled).toBe(true);
      expect(result.auto_lock_minutes).toBe(15);
      expect(result.enabled_widgets).toEqual(['transport', 'medication', 'maintenance', 'inventory', 'weather']);
      expect(result.allow_guest_view).toBe(true);
      expect(dbMock.kioskSettings.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-1',
          isEnabled: true,
          autoLockMinutes: 15,
          enabledWidgets: ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
          allowGuestView: true,
          requirePinForSwitch: true,
        },
      });
    });
  });
});
