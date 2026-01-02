// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server';
import { GET as GetSettings, PUT as UpdateSettings } from '@/app/api/kiosk/settings/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/kiosk/settings', () => {
  const mockSettings = {
    id: 'settings-123',
    familyId: 'family-test-123',
    isEnabled: true,
    autoLockMinutes: 15,
    enabledWidgets: ['transport', 'medication', 'maintenance'],
    allowGuestView: true,
    requirePinForSwitch: true,
    createdAt: new Date('2025-01-01T12:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET /api/kiosk/settings', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can manage kiosk settings');
    });

    it('should return existing settings for family', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);
      prismaMock.kioskSettings.findUnique.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(prismaMock.kioskSettings.findUnique).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123' },
      });
    });

    it('should create default settings if none exist', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);
      prismaMock.kioskSettings.findUnique.mockResolvedValue(null);
      prismaMock.kioskSettings.create.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(prismaMock.kioskSettings.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          isEnabled: true,
          autoLockMinutes: 15,
          enabledWidgets: [
            'transport',
            'medication',
            'maintenance',
            'inventory',
            'weather',
          ],
          allowGuestView: true,
          requirePinForSwitch: true,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);
      prismaMock.kioskSettings.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get kiosk settings');
    });
  });

  describe('PUT /api/kiosk/settings', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can manage kiosk settings');
    });

    it('should return 400 if autoLockMinutes is invalid', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoLockMinutes: 0 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Auto-lock minutes must be greater than 0');
    });

    it('should return 400 if enabledWidgets contains invalid widget names', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ enabledWidgets: ['transport', 'invalid-widget'] }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid widget names');
    });

    it('should successfully update settings', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const updatedSettings = {
        ...mockSettings,
        autoLockMinutes: 20,
        enabledWidgets: ['transport', 'medication'],
        updatedAt: new Date('2025-01-02T12:00:00Z'),
      };

      prismaMock.kioskSettings.upsert.mockResolvedValue(updatedSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({
          autoLockMinutes: 20,
          enabledWidgets: ['transport', 'medication'],
        }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(prismaMock.kioskSettings.upsert).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123' },
        create: {
          familyId: 'family-test-123',
          autoLockMinutes: 20,
          enabledWidgets: ['transport', 'medication'],
        },
        update: {
          autoLockMinutes: 20,
          enabledWidgets: ['transport', 'medication'],
        },
      });
    });

    it('should create audit log on successful update', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const updatedSettings = {
        ...mockSettings,
        autoLockMinutes: 20,
      };

      prismaMock.kioskSettings.upsert.mockResolvedValue(updatedSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoLockMinutes: 20 }),
      });
      await UpdateSettings(request);

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'KIOSK_SETTINGS_UPDATED',
          entityType: 'KIOSK_SETTINGS',
          entityId: 'settings-123',
          result: 'SUCCESS',
          metadata: {
            changes: { autoLockMinutes: 20 },
          },
        },
      });
    });

    it('should handle partial updates', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const updatedSettings = {
        ...mockSettings,
        isEnabled: false,
      };

      prismaMock.kioskSettings.upsert.mockResolvedValue(updatedSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: false }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isEnabled).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);
      prismaMock.kioskSettings.upsert.mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoLockMinutes: 20 }),
      });
      const response = await UpdateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update kiosk settings');
    });
  });
});
