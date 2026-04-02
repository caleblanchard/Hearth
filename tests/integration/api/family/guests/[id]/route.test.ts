// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/family/guests/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/family/guests/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  const mockGuestInvite = {
    id: 'invite-1',
    familyId: 'family-test-123',
    invitedById: 'parent-test-123',
    guestName: 'Grandma',
    guestEmail: 'grandma@example.com',
    accessLevel: 'VIEW_ONLY',
    inviteCode: '123456',
    inviteToken: 'token-abc123',
    expiresAt: new Date('2026-01-10T00:00:00Z'),
    maxUses: 1,
    useCount: 0,
    status: 'PENDING',
    lastAccessedAt: null,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    revokedAt: null,
  };

  describe('DELETE /api/family/guests/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {
      dbMock.guestInvite.findUnique.mockResolvedValue(mockGuestInvite as any);

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can revoke guest invites');
    });

    it('should return 404 if invite not found', async () => {
      dbMock.guestInvite.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Guest invite not found');
    });

    it('should return 403 if invite belongs to different family', async () => {
      const otherFamilyInvite = {
        ...mockGuestInvite,
        familyId: 'other-family',
      };
      dbMock.guestInvite.findUnique.mockResolvedValue(otherFamilyInvite as any);

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should revoke guest invite successfully', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      dbMock.guestInvite.findUnique.mockResolvedValue(mockGuestInvite as any);

      const revokedInvite = {
        ...mockGuestInvite,
        status: 'REVOKED',
        revokedAt: now,
      };

      dbMock.guestInvite.update.mockResolvedValue(revokedInvite as any);
      dbMock.guestSession.updateMany.mockResolvedValue({ count: 2 } as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Guest invite revoked successfully');

      expect(dbMock.guestInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: {
          status: 'REVOKED',
          revokedAt: now.toISOString(),
        },
      });

      // Verify active sessions were ended
      expect(dbMock.guestSession.updateMany).toHaveBeenCalledWith({
        where: {
          guestInviteId: 'invite-1',
          endedAt: null,
        },
        data: {
          endedAt: now.toISOString(),
        },
      });

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'GUEST_INVITE_REVOKED',
          details: {
            invite_id: 'invite-1',
            guest_name: 'Grandma',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should handle database errors gracefully', async () => {
      dbMock.guestInvite.findUnique.mockResolvedValue(mockGuestInvite as any);
      dbMock.guestInvite.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/family/guests/invite-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'invite-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to revoke guest invite');
    });
  });
});
