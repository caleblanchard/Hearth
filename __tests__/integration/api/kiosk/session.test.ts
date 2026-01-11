// Set up mocks BEFORE any imports
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock';
import { mockSupabaseParentSession, mockSupabaseChildSession, mockGetUserResponse } from '@/lib/test-utils/supabase-auth-mock';

// Mock the Supabase client creator
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  getAuthContext: jest.fn(),
  isParentInFamily: jest.fn(),
  getMemberInFamily: jest.fn(),
}));

// Mock the data layer
jest.mock('@/lib/data/kiosk', () => ({
  createKioskSession: jest.fn(),
  getKioskSession: jest.fn(),
  updateKioskActivity: jest.fn(),
  lockKioskSession: jest.fn(),
  unlockKioskSession: jest.fn(),
  endKioskSession: jest.fn(),
  getOrCreateKioskSettings: jest.fn(),
  checkAutoLock: jest.fn(),
}));

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server';
import { POST as StartSession } from '@/app/api/kiosk/session/start/route';
import { GET as GetSession, DELETE as EndSession } from '@/app/api/kiosk/session/route';
import { POST as UpdateActivity } from '@/app/api/kiosk/session/activity/route';
import { POST as LockSession } from '@/app/api/kiosk/session/lock/route';
import { POST as UnlockSession } from '@/app/api/kiosk/session/unlock/route';

const { createClient, isParentInFamily, getMemberInFamily } = require('@/lib/supabase/server');
const {
  createKioskSession,
  getKioskSession,
  updateKioskActivity,
  lockKioskSession,
  unlockKioskSession,
  endKioskSession,
  getOrCreateKioskSettings,
  checkAutoLock,
} = require('@/lib/data/kiosk');

describe('Kiosk Session API Endpoints', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    createClient.mockReturnValue(mockSupabase);
  });

  describe('POST /api/kiosk/session/start', () => {
    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
      });

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
      const session = mockSupabaseChildSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(false);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: 'family-1' }),
      });

      const response = await StartSession(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('parent');
    });

    it('should create kiosk session successfully', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getMemberInFamily.mockResolvedValue({ id: 'parent-test-123', role: 'PARENT' });

      const mockKioskSettings = {
        id: 'settings-1',
        family_id: session.user.app_metadata.familyId,
        is_enabled: true,
        auto_lock_minutes: 15,
        enabled_widgets: ['transport', 'medication'],
        allow_guest_view: true,
        require_pin_for_switch: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockKioskSession = {
        id: 'kiosk-1',
        session_token: 'token-123',
      };

      getOrCreateKioskSettings.mockResolvedValue(mockKioskSettings);
      createKioskSession.mockResolvedValue(mockKioskSession);

      const auditQuery = mockSupabase.from('audit_logs');
      auditQuery.insert.mockResolvedValue({ data: null, error: null });

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.app_metadata.familyId }),
      });

      const response = await StartSession(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionToken).toBe('token-123');
      expect(data.autoLockMinutes).toBe(15);
      expect(data.enabledWidgets).toEqual(['transport', 'medication']);
    });

    it('should respect kiosk settings isEnabled', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);

      const mockKioskSettings = {
        id: 'settings-1',
        family_id: session.user.app_metadata.familyId,
        is_enabled: false, // Kiosk disabled
        auto_lock_minutes: 15,
        enabled_widgets: [],
        allow_guest_view: true,
        require_pin_for_switch: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      getOrCreateKioskSettings.mockResolvedValue(mockKioskSettings);

      const request = new Request('http://localhost/api/kiosk/session/start', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-123', familyId: session.user.app_metadata.familyId }),
      });

      const response = await StartSession(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
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
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: 'member-1',
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_member: {
          id: 'member-1',
          name: 'Test Child',
          role: 'CHILD' as const,
          avatar_url: null,
        },
      };

      getKioskSession.mockResolvedValue(mockSession);
      checkAutoLock.mockReturnValue(false); // Not expired

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
      expect(data.currentMemberId).toBe('member-1');
    });

    it('should auto-lock expired session', async () => {
      const oldDate = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
      const mockSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: 'member-1',
        last_activity_at: oldDate.toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const lockedSession = {
        ...mockSession,
        current_member_id: null,
      };

      getKioskSession.mockResolvedValue(mockSession);
      checkAutoLock.mockReturnValue(true); // Expired!
      lockKioskSession.mockResolvedValue(lockedSession);

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
      expect(lockKioskSession).toHaveBeenCalledWith('token-123');
    });
  });

  describe('POST /api/kiosk/session/activity', () => {
    it('should update lastActivityAt', async () => {
      const mockSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: null,
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      getKioskSession.mockResolvedValue(mockSession);
      updateKioskActivity.mockResolvedValue(mockSession);

      const request = new Request('http://localhost/api/kiosk/session/activity', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'token-123',
        },
      });

      const response = await UpdateActivity(request as NextRequest);

      expect(response.status).toBe(200);
      expect(updateKioskActivity).toHaveBeenCalledWith('token-123');
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
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: 'member-1',
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const lockedSession = {
        ...mockSession,
        current_member_id: null,
      };

      getKioskSession.mockResolvedValue(mockSession);
      lockKioskSession.mockResolvedValue(lockedSession);

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
    });
  });

  describe('POST /api/kiosk/session/unlock', () => {
    it('should unlock with valid PIN', async () => {
      const mockSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: null,
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const unlockedSession = {
        ...mockSession,
        current_member_id: 'member-1',
      };

      getKioskSession
        .mockResolvedValueOnce(mockSession) // First call before unlock
        .mockResolvedValueOnce(unlockedSession); // Second call after unlock
      unlockKioskSession.mockResolvedValue({ success: true });

      const auditQuery = mockSupabase.from('audit_logs');
      auditQuery.insert.mockResolvedValue({ data: null, error: null });

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
      expect(data.memberId).toBe('member-1');
    });

    it('should return 400 with invalid PIN', async () => {
      const mockSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: null,
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      getKioskSession.mockResolvedValue(mockSession);
      unlockKioskSession.mockResolvedValue({ success: false, error: 'Invalid PIN' });

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
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: null,
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      getKioskSession.mockResolvedValue(mockSession);
      unlockKioskSession.mockResolvedValue({ success: false, error: 'Member not in session family' });

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
      const mockSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: 'child-member-1', // Child is currently logged in
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      getKioskSession.mockResolvedValue(mockSession);

      // Mock the member query to return a CHILD
      const memberQuery = mockSupabase.from('family_members');
      memberQuery.select.mockReturnThis();
      memberQuery.eq.mockReturnThis();
      memberQuery.single.mockResolvedValue({ data: { role: 'CHILD' }, error: null });

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
      const mockKioskSession = {
        id: 'kiosk-1',
        family_id: 'family-1',
        device_id: 'device-123',
        session_token: 'token-123',
        is_active: true,
        current_member_id: 'parent-member-1', // Parent is logged in
        last_activity_at: new Date().toISOString(),
        auto_lock_minutes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const endedSession = {
        ...mockKioskSession,
        is_active: false,
      };

      getKioskSession.mockResolvedValue(mockKioskSession);
      endKioskSession.mockResolvedValue(endedSession);

      // Mock the member query to return a PARENT
      const memberQuery = mockSupabase.from('family_members');
      memberQuery.select.mockReturnThis();
      memberQuery.eq.mockReturnThis();
      memberQuery.single.mockResolvedValue({ data: { role: 'PARENT' }, error: null });

      const auditQuery = mockSupabase.from('audit_logs');
      auditQuery.insert.mockResolvedValue({ data: null, error: null });

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
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      getKioskSession.mockRejectedValue(new Error('Database error'));

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
