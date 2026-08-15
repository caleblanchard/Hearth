jest.mock('@/lib/kiosk-auth', () => ({
  authenticateChildSession: jest.fn(),
  authenticateDeviceSecret: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getAuthContext: jest.fn(),
}));

jest.mock('@/lib/data/transport', () => ({
  getTodaysTransportSchedules: jest.fn(),
}));

jest.mock('@/lib/data/medications', () => ({
  getMedications: jest.fn(),
}));

jest.mock('@/lib/data/maintenance', () => ({
  getUpcomingMaintenanceItems: jest.fn(),
}));

jest.mock('@/lib/data/inventory', () => ({
  getLowStockItems: jest.fn(),
}));

jest.mock('@/lib/data/weather', () => ({
  getWeatherForFamily: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as GetWidgets } from '@/app/api/dashboard/widgets/route';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { getAuthContext } from '@/lib/supabase/server';
import { getTodaysTransportSchedules } from '@/lib/data/transport';
import { getMedications } from '@/lib/data/medications';
import { getUpcomingMaintenanceItems } from '@/lib/data/maintenance';
import { getLowStockItems } from '@/lib/data/inventory';
import { getWeatherForFamily } from '@/lib/data/weather';

describe('/api/dashboard/widgets', () => {
  const mockAuthContext = {
    activeFamilyId: 'family-test-123',
    activeMemberId: 'member-test-123',
    user: {
      role: 'PARENT',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/widgets', () => {
    it('should return 401 if not authenticated and no kiosk token', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(null);
      (authenticateChildSession as jest.Mock).mockResolvedValue(null);
      (authenticateDeviceSecret as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should fetch a single widget for an authenticated user', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);
      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.partial).toBe(false);
      expect(data.requested).toEqual(['transport']);
      expect(data.widgets.transport).toEqual({
        kind: 'transport',
        state: 'ready',
        data: { schedules: [] },
      });
      expect(getTodaysTransportSchedules).toHaveBeenCalledWith(
        mockAuthContext.activeFamilyId,
        mockAuthContext.activeMemberId
      );
    });

    it('should fetch multiple widgets in parallel', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);
      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);
      (getWeatherForFamily as jest.Mock).mockResolvedValue({
        location: 'Test City',
        current: { temp: 65 },
        today: { high: 70, low: 55 },
        forecast: [],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.widgets.transport.state).toBe('ready');
      expect(data.widgets.weather.state).toBe('ready');
      expect(getTodaysTransportSchedules).toHaveBeenCalledTimes(1);
      expect(getWeatherForFamily).toHaveBeenCalledTimes(1);
    });

    it('should authenticate via kiosk child session if no regular session', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(null);
      (authenticateChildSession as jest.Mock).mockResolvedValue({
        familyId: 'family-test-123',
        memberId: 'child-test-123',
      });
      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport'
      );
      const response = await GetWidgets(request);

      expect(response.status).toBe(200);
      expect(authenticateChildSession).toHaveBeenCalled();
      expect(getTodaysTransportSchedules).toHaveBeenCalledWith(
        'family-test-123',
        'child-test-123'
      );
    });

    it('should authenticate via kiosk device secret if no session or child', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(null);
      (authenticateChildSession as jest.Mock).mockResolvedValue(null);
      (authenticateDeviceSecret as jest.Mock).mockResolvedValue({
        deviceId: 'device-123',
        familyId: 'family-test-123',
      });
      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport',
        { headers: { 'X-Kiosk-Device': 'device-secret' } }
      );
      const response = await GetWidgets(request);

      expect(response.status).toBe(200);
      expect(authenticateDeviceSecret).toHaveBeenCalled();
    });

    it('should handle widget fetch failures with partial results', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);
      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);
      (getWeatherForFamily as jest.Mock).mockRejectedValue(
        new Error('Weather unavailable')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.partial).toBe(true);
      expect(data.widgets.transport.state).toBe('ready');
      expect(data.widgets.weather).toEqual({
        kind: 'weather',
        state: 'unavailable',
        error: 'Weather unavailable',
      });
      expect(data.issues).toEqual([
        { kind: 'weather', message: 'Weather unavailable' },
      ]);
    });

    it('should return 400 if no widgets parameter provided', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);

      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets');
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No widgets specified');
    });

    it('should return 400 for invalid widget names', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=invalid-widget'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid widget names');
    });

    it('should handle all valid widget types', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext);

      (getTodaysTransportSchedules as jest.Mock).mockResolvedValue([]);
      (getMedications as jest.Mock).mockResolvedValue([]);
      (getUpcomingMaintenanceItems as jest.Mock).mockResolvedValue([]);
      (getLowStockItems as jest.Mock).mockResolvedValue([]);
      (getWeatherForFamily as jest.Mock).mockResolvedValue({
        location: 'Test City',
        current: { temp: 65 },
        today: { high: 70, low: 55 },
        forecast: [],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=medication&widgets[]=maintenance&widgets[]=inventory&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.widgets.transport).toBeDefined();
      expect(data.widgets.medication).toBeDefined();
      expect(data.widgets.maintenance).toBeDefined();
      expect(data.widgets.inventory).toBeDefined();
      expect(data.widgets.weather).toBeDefined();
      expect(getTodaysTransportSchedules).toHaveBeenCalledTimes(1);
      expect(getMedications).toHaveBeenCalledTimes(1);
      expect(getUpcomingMaintenanceItems).toHaveBeenCalledTimes(1);
      expect(getLowStockItems).toHaveBeenCalledTimes(1);
      expect(getWeatherForFamily).toHaveBeenCalledTimes(1);
    });
  });
});
