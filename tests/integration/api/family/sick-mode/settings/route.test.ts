// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';
import { mockParentSession, mockChildSession, setMockSession } from '@/lib/test-utils/auth-mock';

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/family/sick-mode/settings/route';

describe('/api/family/sick-mode/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
    mockParentSession();
  });

  const mockSettings = {
    id: 'settings-1',
    familyId: 'family-test-123',
    autoEnableOnTemperature: true,
    temperatureThreshold: 100.4,
    autoDisableAfter24Hours: false,
    pauseChores: true,
    pauseScreenTimeTracking: true,
    screenTimeBonus: 120,
    skipMorningRoutine: true,
    skipBedtimeRoutine: false,
    muteNonEssentialNotifs: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      setMockSession(null);
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return settings for family', async () => {
      dbMock.sickModeSettings.findUnique.mockResolvedValue(mockSettings as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings.pauseChores).toBe(true);
      expect(data.settings.screenTimeBonus).toBe(120);

      expect(dbMock.sickModeSettings.findUnique).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123' },
      });
    });

    it('should create default settings if none exist', async () => {
      dbMock.sickModeSettings.findUnique.mockResolvedValue(null);
      dbMock.sickModeSettings.findFirst.mockResolvedValue(null);
      dbMock.sickModeSettings.upsert.mockResolvedValue(mockSettings as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'GET',
        });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toBeDefined();

      expect(dbMock.sickModeSettings.upsert).toHaveBeenCalled();
    });

    it('should allow children to view settings', async () => {
      mockChildSession();
      dbMock.sickModeSettings.findUnique.mockResolvedValue(mockSettings as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toBeDefined();
    });
  });

  describe('PUT', () => {
    it('should return 401 if not authenticated', async () => {
      setMockSession(null);
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pauseChores: false,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to update settings', async () => {
      mockChildSession();
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pauseChores: false,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Parent access required');
    });

    it('should allow parents to update settings', async () => {
      dbMock.sickModeSettings.findUnique.mockResolvedValue(mockSettings as any);
      dbMock.sickModeSettings.upsert.mockResolvedValue({
        ...mockSettings,
        pauseChores: false,
        screenTimeBonus: 60,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pauseChores: false,
          screenTimeBonus: 60,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings.pauseChores).toBe(false);
      expect(data.settings.screenTimeBonus).toBe(60);

      expect(dbMock.sickModeSettings.upsert).toHaveBeenCalled();
    });

    it('should create settings if none exist during update', async () => {
      dbMock.sickModeSettings.findUnique.mockResolvedValue(null);
      dbMock.sickModeSettings.findFirst.mockResolvedValue(null);
      dbMock.sickModeSettings.upsert.mockResolvedValue({
        ...mockSettings,
        pauseChores: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pauseChores: false,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(dbMock.sickModeSettings.upsert).toHaveBeenCalled();
    });

    it('should validate temperatureThreshold is a positive number', async () => {
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          temperatureThreshold: -10,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Temperature threshold must be a positive number');
    });

    it('should validate screenTimeBonus is non-negative', async () => {
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          screenTimeBonus: -30,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Screen time bonus must be a non-negative number');
    });

    it('should log audit event on successful update', async () => {
      dbMock.sickModeSettings.findUnique.mockResolvedValue(mockSettings as any);
      dbMock.sickModeSettings.upsert.mockResolvedValue({
        ...mockSettings,
        pauseChores: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pauseChores: false,
        }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'SICK_MODE_SETTINGS_UPDATED',
          entityType: 'SickModeSettings',
          entityId: 'settings-1',
          result: 'SUCCESS',
          details: {
            previousValue: mockSettings,
            newValue: expect.objectContaining({
              pauseChores: false,
            }),
          },
        },
      });
    });
  });
});
