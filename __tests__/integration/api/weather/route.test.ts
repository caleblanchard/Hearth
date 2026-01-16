// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server';
import { GET as GetWeather } from '@/app/api/weather/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/weather', () => {
  const mockFamily = {
    id: 'family-test-123',
    name: 'Test Family',
    location: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
  };

  const mockCurrentWeatherResponse = {
    name: 'San Francisco',
    main: {
      temp: 65.5,
      feels_like: 63.2,
      humidity: 70,
      temp_max: 68.0,
      temp_min: 55.4,
    },
    weather: [
      {
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
  };

  const mockForecastResponse = {
    list: [
      {
        dt: Math.floor(Date.now() / 1000), // Today (now)
        main: { temp: 65.5, temp_max: 68.0, temp_min: 55.4 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
      {
        dt: Math.floor(Date.now() / 1000) + 10800, // Today + 3 hours
        main: { temp: 67.0, temp_max: 68.0, temp_min: 55.4 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
      {
        dt: 1704153600, // Tomorrow
        main: { temp: 63.0, temp_max: 70.0, temp_min: 56.0 },
        weather: [{ main: 'Clouds', description: 'few clouds', icon: '02d' }],
      },
      {
        dt: 1704157200, // Tomorrow + 3 hours
        main: { temp: 65.0, temp_max: 70.0, temp_min: 56.0 },
        weather: [{ main: 'Clouds', description: 'few clouds', icon: '02d' }],
      },
      {
        dt: 1704240000, // Day after tomorrow
        main: { temp: 60.0, temp_max: 67.0, temp_min: 54.0 },
        weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
      },
      {
        dt: 1704243600, // Day after tomorrow + 3 hours
        main: { temp: 62.0, temp_max: 67.0, temp_min: 54.0 },
        weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
      },
      {
        dt: 1704326400, // 3 days from now
        main: { temp: 64.0, temp_max: 69.0, temp_min: 57.0 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    (global.fetch as jest.Mock).mockClear();
    process.env.WEATHER_API_KEY = 'test-api-key';
  });

  describe('GET /api/weather', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should fetch weather data for authenticated user', async () => {
      const session = mockParentSession();

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCurrentWeatherResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastResponse,
        });

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current).toBeDefined();
      expect(data.current.temp).toBe(66); // Rounded from 65.5
      expect(data.current.feelsLike).toBe(63); // Rounded from 63.2
      expect(data.current.condition).toBe('Clear');
      expect(data.current.icon).toBe('01d');
      expect(data.today).toBeDefined();
      expect(data.today.high).toBe(68); // Rounded from 68.0
      expect(data.today.low).toBe(55); // Rounded from 55.4
      expect(data.forecast).toBeDefined();
      expect(Array.isArray(data.forecast)).toBe(true);
    });

    it('should return weather data for child users', async () => {
      const session = mockChildSession();

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCurrentWeatherResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastResponse,
        });

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);

      expect(response.status).toBe(200);
    });

    it('should return 404 if family has no location set', async () => {
      const session = mockParentSession();

      prismaMock.family.findUnique.mockResolvedValue({
        ...mockFamily,
        latitude: null,
        longitude: null,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Family location not configured');
    });

    it('should handle weather API errors gracefully', async () => {
      const session = mockParentSession();

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch weather data');
    });

    it('should handle network errors gracefully', async () => {
      const session = mockParentSession();

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/weather');
      const response = await GetWeather(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch weather data');
    });

    it('should call OpenWeatherMap API with correct parameters', async () => {
      const session = mockParentSession();

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCurrentWeatherResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastResponse,
        });

      const request = new NextRequest('http://localhost:3000/api/weather');
      await GetWeather(request);

      // Check that both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Check current weather API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org/data/2.5/weather')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('lat=37.7749')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('lon=-122.4194')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('units=imperial')
      );
      
      // Check forecast API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org/data/2.5/forecast')
      );
    });
  });
});
