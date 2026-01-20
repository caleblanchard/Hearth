// Set up mocks BEFORE any imports
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the logger to avoid console output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch for OpenWeatherMap API
global.fetch = jest.fn();

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/geocoding/route';
import { mockParentSession } from '@/lib/test-utils/auth-mock';

describe('/api/geocoding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEATHER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.WEATHER_API_KEY;
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=90210');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    it('should return 400 if neither zip nor city is provided', async () => {

      const request = new NextRequest('http://localhost:3000/api/geocoding');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Either zip or city parameter is required');
    });

    it('should return 500 if WEATHER_API_KEY is not configured', async () => {
      delete process.env.WEATHER_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=90210');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Geocoding service not configured');
    });
  });

  describe('Zip Code Geocoding', () => {
    it('should geocode a valid US zip code', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Beverly Hills',
          lat: 34.0901,
          lon: -118.4065,
          country: 'US',
          state: 'California',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=90210&country=US');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        name: 'Beverly Hills',
        lat: 34.0901,
        lon: -118.4065,
        country: 'US',
        state: 'California',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org/geo/1.0/zip?zip=90210%2CUS')
      );
    });

    it('should geocode a valid UK postal code', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Westminster',
          lat: 51.5014,
          lon: -0.1419,
          country: 'GB',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=SW1A 1AA&country=GB');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Westminster');
      expect(data.country).toBe('GB');
    });

    it('should return 404 for invalid zip code', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'zip code not found',
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=00000&country=US');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Zip code not found');
    });

    it('should default to US country if not specified', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'New York',
          lat: 40.7128,
          lon: -74.006,
          country: 'US',
          state: 'New York',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=10001');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('zip=10001%2CUS')
      );
    });
  });

  describe('City Name Geocoding', () => {
    it('should geocode a city name and return multiple results', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'London',
            lat: 51.5073,
            lon: -0.1276,
            country: 'GB',
            state: 'England',
          },
          {
            name: 'City of London',
            lat: 51.5156,
            lon: -0.092,
            country: 'GB',
            state: 'England',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?city=London&country=GB');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.results[0].name).toBe('London');
      expect(data.results[1].name).toBe('City of London');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org/geo/1.0/direct?q=London%2CGB')
      );
    });

    it('should return 404 for city not found', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?city=InvalidCityName&country=US');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('City not found');
    });

    it('should handle API errors gracefully', async () => {

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const request = new NextRequest('http://localhost:3000/api/geocoding?city=Paris&country=FR');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to geocode location');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/geocoding?zip=90210');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to geocode location');
    });
  });
});
