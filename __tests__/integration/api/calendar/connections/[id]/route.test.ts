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

// Mock NextResponse
const originalJson = NextResponse.json;

NextResponse.json = function (body: any, init?: any) {
  const response = originalJson(body, init);
  return response;
};

// Import routes after mocking
import { GET, PATCH, DELETE } from '@/app/api/calendar/connections/[id]/route';

describe('/api/calendar/connections/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return connection details', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        provider: 'GOOGLE',
        googleEmail: 'user@example.com',
        syncStatus: 'ACTIVE',
        syncEnabled: true,
        importFromGoogle: true,
        exportToGoogle: true,
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.connection).toMatchObject({
        id: 'connection-1',
        provider: 'GOOGLE',
        googleEmail: 'user@example.com',
      });
    });

    it('should return 404 if connection not found', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Connection not found');
    });

    it('should return 403 if connection belongs to different user', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-other',
        memberId: 'other-member-id', // Different member
        provider: 'GOOGLE',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-other');
      const response = await GET(request, { params: Promise.resolve({ id: 'connection-other' }) });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toBe('Forbidden');
    });
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'PATCH',
        body: JSON.stringify({ syncEnabled: false }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(401);
    });

    it('should update sync settings', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        provider: 'GOOGLE',
        syncEnabled: true,
        importFromGoogle: true,
        exportToGoogle: true,
      } as any);

      prismaMock.calendarConnection.update.mockResolvedValue({
        id: 'connection-1',
        syncEnabled: false,
        importFromGoogle: false,
        exportToGoogle: false,
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'PATCH',
        body: JSON.stringify({
          syncEnabled: false,
          importFromGoogle: false,
          exportToGoogle: false,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
        data: {
          syncEnabled: false,
          importFromGoogle: false,
          exportToGoogle: false,
        },
        select: expect.any(Object),
      });
    });

    it('should only update provided fields', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      prismaMock.calendarConnection.update.mockResolvedValue({
        id: 'connection-1',
        syncEnabled: false,
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'PATCH',
        body: JSON.stringify({ syncEnabled: false }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
        data: { syncEnabled: false },
        select: expect.any(Object),
      });
    });

    it('should return 400 for invalid fields', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'PATCH',
        body: JSON.stringify({ invalidField: true }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid');
    });

    it('should return 403 if connection belongs to different user', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-other',
        memberId: 'other-member-id',
        provider: 'GOOGLE',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-other', {
        method: 'PATCH',
        body: JSON.stringify({ syncEnabled: false }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-other' }) });

      expect(response.status).toBe(403);
    });

    it('should clear sync error when re-enabling sync', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        syncStatus: 'ERROR',
        syncError: 'Token expired',
      } as any);

      prismaMock.calendarConnection.update.mockResolvedValue({
        id: 'connection-1',
        syncEnabled: true,
        syncError: null,
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'PATCH',
        body: JSON.stringify({ syncEnabled: true }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncError: null,
          }),
        })
      );
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(401);
    });

    it('should delete calendar connection', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-1',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({
        id: 'connection-1',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'connection-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.calendarConnection.delete).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
      });

      const json = await response.json();
      expect(json.message).toBe('Connection deleted successfully');
    });

    it('should return 404 if connection not found', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if connection belongs to different user', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-other',
        memberId: 'other-member-id',
        provider: 'GOOGLE',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-other', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'connection-other' }) });

      expect(response.status).toBe(403);
    });

    it('should allow child users to delete their own connections', async () => {
      const session = mockChildSession();

      prismaMock.familyMember.findFirst.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: 'connection-child',
        memberId: session.user.id,
        provider: 'GOOGLE',
      } as any);

      prismaMock.calendarConnection.delete.mockResolvedValue({
        id: 'connection-child',
      } as any);

      const request = new NextRequest('http://localhost:3001/api/calendar/connections/connection-child', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'connection-child' }) });

      expect(response.status).toBe(200);
    });
  });
});
