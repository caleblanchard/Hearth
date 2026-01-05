// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock GoogleCalendarClient
jest.mock('@/lib/integrations/google-calendar', () => ({
  GoogleCalendarClient: jest.fn(),
}));

// NOW import modules after mocks are set up
import { NextRequest, NextResponse } from 'next/server';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { GoogleCalendarClient } from '@/lib/integrations/google-calendar';
import crypto from 'crypto';

// Mock the NextResponse to include cookies API
const originalJson = NextResponse.json;
NextResponse.json = function (body: any, init?: any) {
  const response = originalJson(body, init);
  if (!response.cookies) {
    response.cookies = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
    } as any;
  }
  return response;
};

// Import route
import { GET } from '@/app/api/calendar/google/connect/route';

const { auth } = require('@/lib/auth');

describe('/api/calendar/google/connect', () => {
  let mockGetAuthUrl: jest.Mock;

  beforeAll(() => {
    // Set required environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3001';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();

    // Mock GoogleCalendarClient instance
    mockGetAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?client_id=test');
    (GoogleCalendarClient as jest.Mock).mockImplementation(() => ({
      getAuthUrl: mockGetAuthUrl,
    }));
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should generate OAuth URL and set state cookie for authenticated user', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toBe('https://accounts.google.com/oauth/authorize?client_id=test');
      expect(mockGetAuthUrl).toHaveBeenCalledWith(expect.any(String)); // Any state token

      // Check that state cookie was set
      expect(response.cookies.set).toHaveBeenCalledWith(
        'google_oauth_state',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Not production in tests
          sameSite: 'lax',
          maxAge: 600,
          path: '/api/calendar/google',
        })
      );
    });

    it('should allow child users to connect their calendar', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toBeDefined();
    });

    it('should generate unique state token for each request', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request1 = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response1 = await GET();
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      const firstCallState = mockGetAuthUrl.mock.calls[0][0];

      const request2 = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response2 = await GET();
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      const secondCallState = mockGetAuthUrl.mock.calls[1][0];

      // State tokens should be different (random)
      expect(firstCallState).not.toBe(secondCallState);
      expect(firstCallState).toBeTruthy();
      expect(secondCallState).toBeTruthy();
    });

    it('should handle errors from GoogleCalendarClient', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      mockGetAuthUrl.mockImplementation(() => {
        throw new Error('Google Calendar API error');
      });

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to initiate Google Calendar connection');
    });

    it('should handle missing GOOGLE_CLIENT_ID', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      (GoogleCalendarClient as jest.Mock).mockImplementation(() => {
        throw new Error('GOOGLE_CLIENT_ID must be set');
      });

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to initiate Google Calendar connection');
    });

    it('should set cookie with correct path and expiry', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost:3001/api/calendar/google/connect');
      const response = await GET();

      // Verify cookies.set was called with path and maxAge
      expect(response.cookies.set).toHaveBeenCalledWith(
        'google_oauth_state',
        expect.any(String),
        expect.objectContaining({
          path: '/api/calendar/google',
          maxAge: 600,
        })
      );
    });
  });
});
