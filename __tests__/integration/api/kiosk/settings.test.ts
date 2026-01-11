// Set up mocks BEFORE any imports
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock';
import { mockSupabaseParentSession, mockSupabaseChildSession, mockGetUserResponse } from '@/lib/test-utils/supabase-auth-mock';

// Mock the Supabase client creator
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  isParentInFamily: jest.fn(),
  getMemberInFamily: jest.fn(),
}));

// Mock the data layer
jest.mock('@/lib/data/kiosk', () => ({
  getOrCreateKioskSettings: jest.fn(),
  updateKioskSettings: jest.fn(),
}));

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server';
import { GET as GetSettings, PUT as UpdateSettings } from '@/app/api/kiosk/settings/route';

const { createClient, isParentInFamily, getMemberInFamily } = require('@/lib/supabase/server');
const { getOrCreateKioskSettings, updateKioskSettings } = require('@/lib/data/kiosk');

describe('/api/kiosk/settings', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const mockSettings = {
    id: 'settings-123',
    family_id: 'family-test-123',
    is_enabled: true,
    auto_lock_minutes: 15,
    enabled_widgets: ['transport', 'medication', 'maintenance'],
    allow_guest_view: true,
    require_pin_for_switch: true,
    created_at: '2025-01-01T12:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    createClient.mockReturnValue(mockSupabase);
  });

  describe('GET /api/kiosk/settings', () => {
    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
      });

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-test-123');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockSupabaseChildSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-test-123');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can manage kiosk settings');
    });

    it('should return existing settings for family', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getOrCreateKioskSettings.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-test-123');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(getOrCreateKioskSettings).toHaveBeenCalledWith('family-test-123');
    });

    it('should create default settings if none exist', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getOrCreateKioskSettings.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-test-123');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(getOrCreateKioskSettings).toHaveBeenCalledWith('family-test-123');
    });

    it('should handle errors gracefully', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getOrCreateKioskSettings.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-test-123');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get kiosk settings');
    });
  });

  describe('PUT /api/kiosk/settings', () => {
    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
      });

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockSupabaseChildSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can manage kiosk settings');
    });

    it('should return 400 if autoLockMinutes is invalid', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', autoLockMinutes: 0 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Auto-lock minutes must be greater than 0');
    });

    it('should return 400 if enabledWidgets contains invalid widget names', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', enabledWidgets: ['transport', 'invalid-widget'] }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid widget names');
    });

    it('should successfully update settings', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getMemberInFamily.mockResolvedValue({ id: 'parent-test-123', role: 'PARENT' });

      const updatedSettings = {
        ...mockSettings,
        auto_lock_minutes: 20,
        enabled_widgets: ['transport', 'medication'],
        updated_at: '2025-01-02T12:00:00Z',
      };

      getOrCreateKioskSettings.mockResolvedValue(mockSettings);
      updateKioskSettings.mockResolvedValue(updatedSettings);

      const auditQuery = mockSupabase.from('audit_logs');
      auditQuery.insert.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({
          familyId: 'family-test-123',
          autoLockMinutes: 20,
          enabledWidgets: ['transport', 'medication'],
        }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(updateKioskSettings).toHaveBeenCalledWith('family-test-123', {
        auto_lock_minutes: 20,
        enabled_widgets: ['transport', 'medication'],
      });
    });

    it('should handle partial updates', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      getMemberInFamily.mockResolvedValue({ id: 'parent-test-123', role: 'PARENT' });

      const updatedSettings = {
        ...mockSettings,
        is_enabled: false,
      };

      getOrCreateKioskSettings.mockResolvedValue(mockSettings);
      updateKioskSettings.mockResolvedValue(updatedSettings);

      const auditQuery = mockSupabase.from('audit_logs');
      auditQuery.insert.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', isEnabled: false }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.is_enabled).toBe(false);
      expect(updateKioskSettings).toHaveBeenCalledWith('family-test-123', {
        is_enabled: false,
      });
    });

    it('should handle errors gracefully', async () => {
      const session = mockSupabaseParentSession();
      mockSupabase.auth.getUser.mockResolvedValue(mockGetUserResponse(session.user));
      isParentInFamily.mockResolvedValue(true);
      updateKioskSettings.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ familyId: 'family-test-123', autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update kiosk settings');
    });
  });
});
