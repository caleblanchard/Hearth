// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/family/guests/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/family/guests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
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

  describe('GET /api/family/guests', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/family/guests');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {

      const request = new NextRequest('http://localhost:3000/api/family/guests');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can view guest invites');
    });

    it('should return all active guest invites', async () => {
      const mockInvites = [
        mockGuestInvite,
        {
          ...mockGuestInvite,
          id: 'invite-2',
          guestName: 'Babysitter Jane',
          status: 'ACTIVE',
        },
      ];

      prismaMock.guestInvite.findMany.mockResolvedValue(mockInvites as any);

      const request = new NextRequest('http://localhost:3000/api/family/guests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(2);
      expect(data.invites[0].guestName).toBe('Grandma');
      expect(data.invites[1].guestName).toBe('Babysitter Jane');

      expect(prismaMock.guestInvite.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          status: {
            in: ['PENDING', 'ACTIVE'],
          },
        },
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          sessions: {
            where: {
              endedAt: null,
            },
            orderBy: {
              startedAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no invites exist', async () => {
      prismaMock.guestInvite.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/family/guests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.guestInvite.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/family/guests');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch guest invites');
    });
  });
});
