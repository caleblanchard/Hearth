// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server';
import { POST as StartSession } from '@/app/api/kiosk/session/start/route';
import { GET as GetSession, DELETE as EndSession } from '@/app/api/kiosk/session/route';
import { POST as UpdateActivity } from '@/app/api/kiosk/session/activity/route';
import { POST as LockSession } from '@/app/api/kiosk/session/lock/route';
import { POST as UnlockSession } from '@/app/api/kiosk/session/unlock/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import bcrypt from 'bcrypt';

const { auth } = require('@/lib/auth');

describe('Kiosk Session API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('POST /api/kiosk/session/start', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: 'family-1' }),
      });

      const response = await StartSession(request as NextRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.familyId }),
      });

      const response = await StartSession(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('parent');
    });

    it('should create kiosk session successfully', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockKioskSession = {
        id: 'kiosk-1',
        familyId: session.user.familyId,
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSettings = {
        id: 'settings-1',
        familyId: session.user.familyId,
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport', 'medication'],
        allowGuestView: true,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);
      prismaMock.kioskSession.findUnique.mockResolvedValue(null);
      prismaMock.kioskSession.create.mockResolvedValue(mockKioskSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.familyId }),
      });

      const response = await StartSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionToken).toBe('token-123');
      expect(data.autoLockMinutes).toBe(15);
      expect(data.enabledWidgets).toEqual(['transport', 'medication']);
    });

    it('should return existing active session for deviceId', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const existingSession = {
        id: 'kiosk-1',
        familyId: session.user.familyId,
        deviceId: 'device-123',
        sessionToken: 'token-existing',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSession = {
        ...existingSession,
        currentMemberId: null,
      };

      const mockSettings = {
        id: 'settings-1',
        familyId: session.user.familyId,
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport'],
        allowGuestView: true,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);
      prismaMock.kioskSession.findUnique.mockResolvedValue(existingSession);
      prismaMock.kioskSession.update.mockResolvedValue(updatedSession);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.familyId }),
      });

      const response = await StartSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionToken).toBe('token-existing');
    });

    it('should respect kiosk settings isEnabled', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockSettings = {
        id: 'settings-1',
        familyId: session.user.familyId,
        isEnabled: false, // Kiosk disabled
        autoLockMinutes: 15,
        enabledWidgets: [],
        allowGuestView: true,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.familyId }),
      });

      const response = await StartSession(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });

    it('should create audit log', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockKioskSession = {
        id: 'kiosk-1',
        familyId: session.user.familyId,
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSettings = {
        id: 'settings-1',
        familyId: session.user.familyId,
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: [],
        allowGuestView: true,
        requirePinForSwitch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);
      prismaMock.kioskSession.findUnique.mockResolvedValue(null);
      prismaMock.kioskSession.create.mockResolvedValue(mockKioskSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.familyId }),
      });

      await StartSession(request as NextRequest);

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'KIOSK_SESSION_STARTED',
          }),
        })
      );
    });
  });

  describe('GET /api/kiosk/session', () => {
    it('should return 401 without valid token', async () => {
      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'GET',
      });

      const response = await GetSession(request as NextRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return session status', async () => {
      const mockSession = {
        id: 'kiosk-1',
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

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);

      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'GET',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await GetSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isActive).toBe(true);
      expect(data.isLocked).toBe(false);
      expect(data.currentMember.name).toBe('Test Child');
    });

    it('should auto-lock expired session', async () => {
      const mockSession = {
        id: 'kiosk-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lockedSession = {
        ...mockSession,
        currentMemberId: null,
      };

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      prismaMock.kioskSession.update.mockResolvedValue(lockedSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'GET',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await GetSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isLocked).toBe(true);
      expect(prismaMock.kioskSession.update).toHaveBeenCalled();
    });
  });

  describe('POST /api/kiosk/session/activity', () => {
    it('should update lastActivityAt', async () => {
      const mockSession = {
        id: 'kiosk-1',
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

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      prismaMock.kioskSession.update.mockResolvedValue(mockSession);

      const request = new Request('http://localhost/api/kiosk/session/activity', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await UpdateActivity(request as NextRequest);

      expect(response.status).toBe(200);
      expect(prismaMock.kioskSession.update).toHaveBeenCalled();
    });

    it('should return 401 without valid token', async () => {
      const request = new Request('http://localhost/api/kiosk/session/activity', {
        method: 'POST',
      });

      const response = await UpdateActivity(request as NextRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/kiosk/session/lock', () => {
    it('should lock session successfully', async () => {
      const mockSession = {
        id: 'kiosk-1',
        familyId: 'family-1',
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: 'member-1',
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lockedSession = {
        ...mockSession,
        currentMemberId: null,
      };

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      prismaMock.kioskSession.update.mockResolvedValue(lockedSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session/lock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await LockSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/kiosk/session/unlock', () => {
    it('should unlock with valid PIN', async () => {
      const hashedPin = await bcrypt.hash('1234', 10);

      const mockSession = {
        id: 'kiosk-1',
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

      const unlockedSession = {
        ...mockSession,
        currentMemberId: 'member-1',
        currentMember: {
          id: 'member-1',
          name: 'Test Child',
          role: 'CHILD' as const,
          avatarUrl: null,
        },
      };

      // Mock sequence:
      // 1. First getKioskSession call in endpoint
      // 2. findUnique in unlockKioskSession for session
      // 3. findUnique for family member
      // 4. update to unlock session
      // 5. Second getKioskSession call in endpoint
      prismaMock.kioskSession.findUnique
        .mockResolvedValueOnce(mockSession) // First getKioskSession
        .mockResolvedValueOnce(mockSession) // unlockKioskSession
        .mockResolvedValueOnce(unlockedSession); // Second getKioskSession
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.kioskSession.update.mockResolvedValue(unlockedSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session/unlock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
        body: JSON.stringify({ memberId: 'member-1', pin: '1234' }),
      });

      const response = await UnlockSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.member).toBeDefined();
      expect(data.member.name).toBe('Test Child');
    });

    it('should return 400 with invalid PIN', async () => {
      const hashedPin = await bcrypt.hash('1234', 10);

      const mockSession = {
        id: 'kiosk-1',
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

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/kiosk/session/unlock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
        body: JSON.stringify({ memberId: 'member-1', pin: '9999' }),
      });

      const response = await UnlockSession(request as NextRequest);

      expect(response.status).toBe(400);
    });

    it('should return 403 for different family member', async () => {
      const mockSession = {
        id: 'kiosk-1',
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
        familyId: 'family-2', // Different family
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

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockSession);
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/kiosk/session/unlock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
        body: JSON.stringify({ memberId: 'member-1', pin: '1234' }),
      });

      const response = await UnlockSession(request as NextRequest);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/kiosk/session', () => {
    it('should return 403 if not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'DELETE',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await EndSession(request as NextRequest);

      expect(response.status).toBe(403);
    });

    it('should end session successfully', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockKioskSession = {
        id: 'kiosk-1',
        familyId: session.user.familyId,
        deviceId: 'device-123',
        sessionToken: 'token-123',
        isActive: true,
        currentMemberId: null,
        lastActivityAt: new Date(),
        autoLockMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const endedSession = {
        ...mockKioskSession,
        isActive: false,
      };

      prismaMock.kioskSession.findUnique.mockResolvedValue(mockKioskSession);
      prismaMock.kioskSession.update.mockResolvedValue(endedSession);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'DELETE',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await EndSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'KIOSK_SESSION_ENDED',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaMock.kioskSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/kiosk/session', {
        method: 'GET',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await GetSession(request as NextRequest);

      expect(response.status).toBe(500);
    });
  });
});
