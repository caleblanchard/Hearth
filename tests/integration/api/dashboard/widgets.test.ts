// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock kiosk auth + supabase auth context
jest.mock('@/lib/kiosk-auth', () => ({
  authenticateChildSession: jest.fn(),
  authenticateDeviceSecret: jest.fn(),
}));
jest.mock('@/lib/supabase/server', () => ({
  getAuthContext: jest.fn(),
}));

// Mock the widget route handlers
jest.mock('@/app/api/transport/today/route', () => ({
  GET: jest.fn(),
}));
jest.mock('@/app/api/medications/route', () => ({
  GET: jest.fn(),
}));
jest.mock('@/app/api/maintenance/upcoming/route', () => ({
  GET: jest.fn(),
}));
jest.mock('@/app/api/inventory/low-stock/route', () => ({
  GET: jest.fn(),
}));
jest.mock('@/app/api/weather/route', () => ({
  GET: jest.fn(),
}));

// NOW import the routes after mocks are set up
import { NextRequest, NextResponse } from 'next/server';
import { GET as GetWidgets } from '@/app/api/dashboard/widgets/route';
import { mockParentSession } from '@/lib/test-utils/auth-mock';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { getAuthContext } from '@/lib/supabase/server';
const { GET: GetTransport } = require('@/app/api/transport/today/route');
const { GET: GetMedications } = require('@/app/api/medications/route');
const { GET: GetMaintenance } = require('@/app/api/maintenance/upcoming/route');
const { GET: GetInventory } = require('@/app/api/inventory/low-stock/route');
const { GET: GetWeather } = require('@/app/api/weather/route');

describe('/api/dashboard/widgets', () => {
  const mockTransportData = {
    todaySchedules: [
      {
        id: 'schedule-1',
        type: 'SCHOOL_PICKUP',
        time: '15:00',
        location: 'Elementary School',
        driver: 'Parent 1',
      },
    ],
  };

  const mockWeatherData = {
    location: 'San Francisco, CA',
    current: { temp: 65, condition: 'Clear' },
    today: { high: 70, low: 55 },
    forecast: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
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

    it('should fetch single widget for authenticated user', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transport).toBeDefined();
      expect(data.transport.success).toBe(true);
      expect(data.transport.data).toEqual(mockTransportData);
    });

    it('should fetch multiple widgets in parallel', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );
      GetWeather.mockResolvedValue(
        NextResponse.json(mockWeatherData, { status: 200 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transport).toBeDefined();
      expect(data.transport.success).toBe(true);
      expect(data.weather).toBeDefined();
      expect(data.weather.success).toBe(true);
      expect(GetTransport).toHaveBeenCalledTimes(1);
      expect(GetWeather).toHaveBeenCalledTimes(1);
    });

    it('should authenticate via kiosk child session if no regular session', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(null);
      (authenticateChildSession as jest.Mock).mockResolvedValue({
        familyId: 'family-test-123',
        memberId: 'child-test-123',
      });
      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport'
      );
      const response = await GetWidgets(request);

      expect(response.status).toBe(200);
      expect(authenticateChildSession).toHaveBeenCalled();
    });

    it('should authenticate via kiosk device secret if no session or child', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue(null);
      (authenticateChildSession as jest.Mock).mockResolvedValue(null);
      (authenticateDeviceSecret as jest.Mock).mockResolvedValue({
        deviceId: 'device-123',
        familyId: 'family-test-123',
      });
      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport',
        { headers: { 'X-Kiosk-Device': 'device-secret' } }
      );
      const response = await GetWidgets(request);

      expect(response.status).toBe(200);
      expect(authenticateDeviceSecret).toHaveBeenCalled();
    });

    it('should handle widget fetch failures gracefully', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );
      GetWeather.mockResolvedValue(
        NextResponse.json({ error: 'Server error' }, { status: 500 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transport.success).toBe(true);
      expect(data.weather.success).toBe(false);
      expect(data.weather.error).toBeDefined();
    });

    it('should return 400 if no widgets parameter provided', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets');
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No widgets specified');
    });

    it('should return 400 for invalid widget names', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=invalid-widget'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid widget names');
    });

    it('should handle all valid widget types', async () => {
      const session = mockParentSession();
      (getAuthContext as jest.Mock).mockResolvedValue(session);

      GetTransport.mockResolvedValue(NextResponse.json({}, { status: 200 }));
      GetMedications.mockResolvedValue(NextResponse.json({}, { status: 200 }));
      GetMaintenance.mockResolvedValue(NextResponse.json({}, { status: 200 }));
      GetInventory.mockResolvedValue(NextResponse.json({}, { status: 200 }));
      GetWeather.mockResolvedValue(NextResponse.json({}, { status: 200 }));

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport&widgets[]=medication&widgets[]=maintenance&widgets[]=inventory&widgets[]=weather'
      );
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transport).toBeDefined();
      expect(data.medication).toBeDefined();
      expect(data.maintenance).toBeDefined();
      expect(data.inventory).toBeDefined();
      expect(data.weather).toBeDefined();
      expect(GetTransport).toHaveBeenCalledTimes(1);
      expect(GetMedications).toHaveBeenCalledTimes(1);
      expect(GetMaintenance).toHaveBeenCalledTimes(1);
      expect(GetInventory).toHaveBeenCalledTimes(1);
      expect(GetWeather).toHaveBeenCalledTimes(1);
    });
  });
});
