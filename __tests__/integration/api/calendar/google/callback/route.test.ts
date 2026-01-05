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

// Mock token encryption
jest.mock('@/lib/token-encryption', () => ({
  encryptToken: jest.fn((token) => `encrypted:${token}`),
  decryptToken: jest.fn((encrypted) => encrypted.replace('encrypted:', '')),
}));

// NOW import modules after mocks are set up
import { NextRequest, NextResponse } from 'next/server';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { GoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { encryptToken } from '@/lib/token-encryption';

// Mock NextResponse to include cookies and redirect APIs
const originalJson = NextResponse.json;
const originalRedirect = NextResponse.redirect;

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

NextResponse.redirect = function (url: string | URL, init?: any) {
  const response = originalRedirect ? originalRedirect(url, init) : new Response(null, {
    status: 302,
    headers: { location: url.toString() },
  }) as any;

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

// Import route after mocking
import { GET } from '@/app/api/calendar/google/callback/route';

const { auth } = require('@/lib/auth');

describe('/api/calendar/google/callback', () => {
  let mockGetTokensFromCode: jest.Mock;
  let mockGetUserEmail: jest.Mock;

  // Helper to create a properly mocked NextRequest
  function createMockRequest(url: string, cookieValue?: string) {
    const request = new NextRequest(url);

    // Extract query params from URL
    const urlObj = new URL(url);
    Object.defineProperty(request, 'nextUrl', {
      value: {
        searchParams: urlObj.searchParams,
      },
      writable: true,
    });

    // Mock cookies
    Object.defineProperty(request, 'cookies', {
      value: {
        get: jest.fn((name: string) => {
          if (name === 'google_oauth_state' && cookieValue) {
            return { value: cookieValue };
          }
          return undefined;
        }),
      },
    });

    return request;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();

    // Mock GoogleCalendarClient instance
    mockGetTokensFromCode = jest.fn().mockResolvedValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: new Date('2026-01-05T00:00:00Z'),
    });

    mockGetUserEmail = jest.fn().mockResolvedValue('user@example.com');

    (GoogleCalendarClient as jest.Mock).mockImplementation(() => ({
      getTokensFromCode: mockGetTokensFromCode,
      getUserEmail: mockGetUserEmail,
    }));
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token');
      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should return error if state parameter is missing', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123',
        'state-token'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=missing_state');
    });

    it('should return error if code parameter is missing', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?state=state-token',
        'state-token'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=missing_code');
    });

    it('should return error if state cookie is missing', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      // No cookie value passed - will return undefined
      const request = createMockRequest('http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token');

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=invalid_state');
    });

    it('should return error if state does not match cookie', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=wrong-state',
        'correct-state'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=invalid_state');
    });

    it('should exchange code for tokens and create new connection', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      // Mock family member lookup
      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock no existing connection
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      // Mock connection creation
      prismaMock.calendarConnection.create.mockResolvedValue({
        id: 'connection-new',
        memberId: session.user.id,
        familyId: session.user.familyId,
      } as any);

      const response = await GET(request);

      expect(mockGetTokensFromCode).toHaveBeenCalledWith('auth-code-123');
      expect(encryptToken).toHaveBeenCalledWith('access-token-123');
      expect(encryptToken).toHaveBeenCalledWith('refresh-token-456');

      expect(prismaMock.calendarConnection.create).toHaveBeenCalledWith({
        data: {
          memberId: session.user.id,
          familyId: session.user.familyId,
          provider: 'GOOGLE',
          accessToken: 'encrypted:access-token-123',
          refreshToken: 'encrypted:refresh-token-456',
          tokenExpiresAt: new Date('2026-01-05T00:00:00Z'),
          googleEmail: 'user@example.com',
          googleCalendarId: 'primary',
          syncEnabled: true,
          importFromGoogle: true,
          exportToGoogle: true,
          syncStatus: 'ACTIVE',
          nextSyncAt: expect.any(Date),
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('success=true');
    });

    it('should update existing connection if already exists', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock temp connection for getting email
      prismaMock.calendarConnection.create.mockResolvedValue({
        id: 'temp-connection',
      } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({} as any);

      // Mock existing connection
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-existing',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      // Mock connection update
      prismaMock.calendarConnection.update.mockResolvedValue({
        id: 'connection-existing',
      } as any);

      const response = await GET(request);

      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-existing' },
        data: {
          accessToken: 'encrypted:access-token-123',
          refreshToken: 'encrypted:refresh-token-456',
          tokenExpiresAt: new Date('2026-01-05T00:00:00Z'),
          googleEmail: 'user@example.com',
          syncEnabled: true,
          syncStatus: 'ACTIVE',
          syncError: null,
          nextSyncAt: expect.any(Date),
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('success=true');
    });

    it('should handle token exchange errors', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=invalid-code&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      mockGetTokensFromCode.mockRejectedValue(new Error('Invalid authorization code'));

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=token_exchange_failed');
    });

    it('should handle missing refresh token error', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      mockGetTokensFromCode.mockRejectedValue(new Error('No refresh token returned'));

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('error=token_exchange_failed');
    });

    it('should get user email after token exchange', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      // Need to create temporary connection to get email
      prismaMock.calendarConnection.create
        .mockResolvedValueOnce({
          id: 'temp-connection',
        } as any)
        .mockResolvedValueOnce({
          id: 'final-connection',
        } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({} as any);

      const response = await GET(request);

      expect(mockGetUserEmail).toHaveBeenCalled();
      expect(response.status).toBe(302);
    });

    it('should allow child users to connect calendar', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);
      prismaMock.calendarConnection.create.mockResolvedValue({
        id: 'connection-child',
      } as any);

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('success=true');
    });

    it('should clear state cookie after successful connection', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock temp connection, then final connection
      prismaMock.calendarConnection.create
        .mockResolvedValueOnce({
          id: 'temp-connection',
        } as any)
        .mockResolvedValueOnce({
          id: 'final-connection',
        } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({} as any);
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const response = await GET(request);

      // Verify the response clears the cookie (mock environment may not set actual header)
      expect(response.cookies.set).toHaveBeenCalledWith(
        'google_oauth_state',
        '',
        expect.objectContaining({
          maxAge: 0,
        })
      );
    });

    it('should set nextSyncAt to current time for immediate first sync', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      // Mock temp connection, then final connection
      prismaMock.calendarConnection.create
        .mockResolvedValueOnce({
          id: 'temp-connection',
        } as any)
        .mockResolvedValueOnce({
          id: 'final-connection',
        } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({} as any);

      const beforeTime = new Date();
      const response = await GET(request);
      const afterTime = new Date();

      // Second create call is the final connection (first is temp)
      const createCall = prismaMock.calendarConnection.create.mock.calls[1][0];
      const nextSyncAt = createCall.data.nextSyncAt;

      expect(nextSyncAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(nextSyncAt.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });
  });
});
