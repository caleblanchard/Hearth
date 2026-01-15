// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock kiosk session
jest.mock('@/lib/kiosk-session', () => ({
  getKioskSession: jest.fn(),
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
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { getKioskSession } = require('@/lib/kiosk-session');
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
    resetPrismaMock();
  });

  describe('GET /api/dashboard/widgets', () => {
    it('should return 401 if not authenticated and no kiosk token', async () => {
      getKioskSession.mockResolvedValue(null);

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

    it('should authenticate via kiosk token if no regular session', async () => {

      const mockKioskSession = {
        id: 'session-123',
        familyId: 'family-test-123',
        currentMemberId: 'child-test-123',
        isActive: true,
        currentMember: {
          id: 'child-test-123',
          name: 'Test Child',
          role: 'CHILD',
          familyId: 'family-test-123',
        },
      };
      getKioskSession.mockResolvedValue(mockKioskSession);

      GetTransport.mockResolvedValue(
        NextResponse.json(mockTransportData, { status: 200 })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/widgets?widgets[]=transport',
        {
          headers: {
            'X-Kiosk-Token': 'valid-token',
          },
        }
      );
      const response = await GetWidgets(request);

      expect(response.status).toBe(200);
      expect(getKioskSession).toHaveBeenCalledWith('valid-token');
    });

    it('should handle widget fetch failures gracefully', async () => {
      const session = mockParentSession();

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

      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets');
      const response = await GetWidgets(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No widgets specified');
    });

    it('should return 400 for invalid widget names', async () => {
      const session = mockParentSession();

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
