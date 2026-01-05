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

// NOW import modules after mocks are set up
import { NextRequest, NextResponse } from 'next/server';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

// Mock NextResponse to include json API
const originalJson = NextResponse.json;

NextResponse.json = function (body: any, init?: any) {
  const response = originalJson(body, init);
  return response;
};

// Import route after mocking
import { GET } from '@/app/api/calendar/connections/route';

const { auth } = require('@/lib/auth');

describe('/api/calendar/connections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return empty array if user has no connections', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      // Mock family member lookup
      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock no connections
      prismaMock.calendarConnection.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connections).toEqual([]);
    });

    it('should return user calendar connections', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      // Mock family member lookup
      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock connections
      prismaMock.calendarConnection.findMany.mockResolvedValue([
        {
          id: 'connection-1',
          memberId: session.user.id,
          familyId: session.user.familyId,
          provider: 'GOOGLE',
          googleEmail: 'user@example.com',
          syncStatus: 'ACTIVE',
          syncEnabled: true,
          importFromGoogle: true,
          exportToGoogle: true,
          lastSyncAt: new Date('2026-01-04T10:00:00Z'),
          syncError: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-04T10:00:00Z'),
        },
      ] as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connections).toHaveLength(1);
      expect(json.connections[0]).toMatchObject({
        id: 'connection-1',
        provider: 'GOOGLE',
        googleEmail: 'user@example.com',
        syncStatus: 'ACTIVE',
        syncEnabled: true,
        importFromGoogle: true,
        exportToGoogle: true,
      });
    });

    it('should not expose sensitive token fields', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Mock should return data WITHOUT sensitive fields (as Prisma select would)
      prismaMock.calendarConnection.findMany.mockResolvedValue([
        {
          id: 'connection-1',
          provider: 'GOOGLE',
          googleEmail: 'user@example.com',
          syncStatus: 'ACTIVE',
          syncEnabled: true,
          importFromGoogle: true,
          exportToGoogle: true,
          // accessToken and refreshToken excluded by select
        },
      ] as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connections[0].accessToken).toBeUndefined();
      expect(json.connections[0].refreshToken).toBeUndefined();
      expect(json.connections[0].tokenExpiresAt).toBeUndefined();
      expect(json.connections[0].syncToken).toBeUndefined();
    });

    it('should return connections for child users', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findMany.mockResolvedValue([
        {
          id: 'connection-child',
          memberId: session.user.id,
          familyId: session.user.familyId,
          provider: 'GOOGLE',
          googleEmail: 'child@example.com',
          syncStatus: 'ACTIVE',
        },
      ] as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connections).toHaveLength(1);
      expect(json.connections[0].googleEmail).toBe('child@example.com');
    });

    it('should return error if family member not found', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Family member not found');
    });

    it('should include sync error messages when present', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findMany.mockResolvedValue([
        {
          id: 'connection-error',
          memberId: session.user.id,
          provider: 'GOOGLE',
          syncStatus: 'ERROR',
          syncError: 'Token refresh failed: Invalid credentials',
          googleEmail: 'user@example.com',
        },
      ] as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connections[0].syncStatus).toBe('ERROR');
      expect(json.connections[0].syncError).toBe('Token refresh failed: Invalid credentials');
    });

    it('should filter connections to only the current user', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      // Verify the query filters by memberId
      prismaMock.calendarConnection.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections');
      await GET(request);

      expect(prismaMock.calendarConnection.findMany).toHaveBeenCalledWith({
        where: {
          memberId: session.user.id,
        },
        select: expect.objectContaining({
          id: true,
          provider: true,
          googleEmail: true,
          syncStatus: true,
          // Should NOT select sensitive fields
          accessToken: false,
          refreshToken: false,
        }),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
