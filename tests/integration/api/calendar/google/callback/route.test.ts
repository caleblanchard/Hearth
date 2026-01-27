// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

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
    Object.defineProperty(response, 'cookies', {
      value: {
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn(),
        has: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
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

describe('/api/calendar/google/callback', () => {
  let mockGetTokensFromCode: jest.Mock;
  let mockGetUserEmail: jest.Mock;
  let mockGetUserEmailFromToken: jest.Mock;

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
    resetDbMock();

    // Mock GoogleCalendarClient instance
    mockGetTokensFromCode = jest.fn().mockResolvedValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: new Date('2026-01-05T00:00:00Z'),
    });

    mockGetUserEmail = jest.fn().mockResolvedValue('user@example.com');
    mockGetUserEmailFromToken = jest.fn().mockResolvedValue('user@example.com');

    (GoogleCalendarClient as jest.Mock).mockImplementation(() => ({
      getTokensFromCode: mockGetTokensFromCode,
      getUserEmail: mockGetUserEmail,
      getUserEmailFromToken: mockGetUserEmailFromToken,
    }));
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = createMockRequest('http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token');
      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should return error if state parameter is missing', async () => {
      const session = mockParentSession();

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

      // No cookie value passed - will return undefined
      const request = createMockRequest('http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token');

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('error=invalid_state');
    });

    it('should return error if state does not match cookie', async () => {
      const session = mockParentSession();

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

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      // Mock family member lookup
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock no existing connection
      dbMock.calendarConnection.findFirst.mockResolvedValue(null);

      // Mock connection creation
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'connection-new',
        memberId: session.user.id,
        familyId: session.user.familyId,
      } as any);

      const response = await GET(request);

      expect(mockGetTokensFromCode).toHaveBeenCalledWith('auth-code-123');
      expect(encryptToken).toHaveBeenCalledWith('access-token-123');
      expect(encryptToken).toHaveBeenCalledWith('refresh-token-456');

      expect(dbMock.calendarConnection.create).toHaveBeenCalledWith({
        data: {
          memberId: session.user.id,
          familyId: session.user.familyId,
          provider: 'GOOGLE',
          accessToken: 'encrypted:access-token-123',
          refreshToken: 'encrypted:refresh-token-456',
          tokenExpiresAt: '2026-01-05T00:00:00.000Z',
          googleEmail: 'user@example.com',
          isActive: true,
          syncEnabled: true,
          syncStatus: 'ACTIVE',
          name: 'Google Calendar',
          nextSyncAt: expect.any(String),
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard/settings/calendars');
      expect(response.headers.get('location')).toContain('success=calendar_connected');
    });

    it('should update existing connection if already exists', async () => {
      const session = mockParentSession();

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock temp connection for getting email
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'temp-connection',
      } as any);

      dbMock.calendarConnection.delete.mockResolvedValue({} as any);

      // Mock existing connection
      dbMock.calendarConnection.findFirst.mockResolvedValue({
        id: 'connection-existing',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      // Mock connection update
      dbMock.calendarConnection.update.mockResolvedValue({
        id: 'connection-existing',
      } as any);

      const response = await GET(request);

      expect(dbMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-existing' },
        data: {
          accessToken: 'encrypted:access-token-123',
          refreshToken: 'encrypted:refresh-token-456',
          tokenExpiresAt: '2026-01-05T00:00:00.000Z',
          googleEmail: 'user@example.com',
          syncEnabled: true,
          syncStatus: 'ACTIVE',
          syncError: null,
          updatedAt: expect.any(String),
        },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('success=calendar_connected');
    });

    it('should handle token exchange errors', async () => {
      const session = mockParentSession();

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=invalid-code&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
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

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
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

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      dbMock.calendarConnection.findFirst.mockResolvedValue(null);

      // Mock connection creation
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'final-connection',
      } as any);

      dbMock.calendarConnection.delete.mockResolvedValue({} as any);

      const response = await GET(request);

      expect(mockGetUserEmailFromToken).toHaveBeenCalled();
      expect(response.status).toBe(302);
    });

    it('should allow child users to connect calendar', async () => {
      const session = mockChildSession();

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      dbMock.calendarConnection.findFirst.mockResolvedValue(null);
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'connection-child',
      } as any);

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('success=calendar_connected');
    });

    it('should clear state cookie after successful connection', async () => {
      const session = mockParentSession();

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock connection creation
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'final-connection',
      } as any);

      dbMock.calendarConnection.delete.mockResolvedValue({} as any);
      dbMock.calendarConnection.findFirst.mockResolvedValue(null);

      const response = await GET(request);

      // Verify the response clears the cookie (mock environment may not set actual header)
      expect(response.cookies.delete).toHaveBeenCalledWith('google_oauth_state');
    });

    it('should set nextSyncAt to current time for immediate first sync', async () => {
      const session = mockParentSession();

      const request = createMockRequest(
        'http://localhost:3001/api/calendar/google/callback?code=auth-code-123&state=state-token',
        'state-token'
      );

      dbMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      dbMock.calendarConnection.findFirst.mockResolvedValue(null);

      // Mock connection creation
      dbMock.calendarConnection.create.mockResolvedValue({
        id: 'final-connection',
      } as any);

      dbMock.calendarConnection.delete.mockResolvedValue({} as any);

      const beforeTime = new Date();
      const response = await GET(request);
      const afterTime = new Date();

      // Expect create to be called once (final connection)
      const createCall = dbMock.calendarConnection.create.mock.calls[0][0];
      const nextSyncAt = createCall.data.nextSyncAt;

      expect(nextSyncAt).toBeDefined();
      const syncDate = new Date(nextSyncAt);
      expect(syncDate.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(syncDate.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });
  });
});
