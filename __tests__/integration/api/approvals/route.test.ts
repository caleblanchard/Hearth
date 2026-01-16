// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/approvals/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/approvals', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('GET /api/approvals - Unified Queue', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can view the approval queue');
    });

    it('should return empty array if no pending approvals', async () => {

      // Mock empty results for all approval types
      prismaMock.choreInstance.findMany.mockResolvedValueOnce([]);
      prismaMock.rewardRedemption.findMany.mockResolvedValueOnce([]);
      prismaMock.shoppingItem.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.approvals).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return pending chore completions', async () => {

      const mockChore = {
        id: 'abc-123-uuid',
        status: 'COMPLETED',
        completedAt: new Date('2026-01-07T10:00:00Z'),
        assignedTo: {
          id: 'child-1',
          name: 'Alice',
          avatarUrl: null,
        },
        choreSchedule: {
          choreDefinition: {
            name: 'Clean Room',
            creditValue: 10,
            familyId: 'family-test-123',
          },
        },
        notes: 'Cleaned everything!',
        photoUrl: '/uploads/proof.jpg', // Has photo, so HIGH priority
      };

      prismaMock.choreInstance.findMany.mockResolvedValueOnce([mockChore] as any);
      prismaMock.rewardRedemption.findMany.mockResolvedValueOnce([]);
      prismaMock.shoppingItem.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.total).toBe(1);
      expect(data.approvals).toHaveLength(1);
      expect(data.approvals[0]).toMatchObject({
        id: 'chore-abc-123-uuid',
        type: 'CHORE_COMPLETION',
        familyMemberId: 'child-1',
        familyMemberName: 'Alice',
        title: 'Clean Room',
        priority: 'HIGH', // HIGH because has photo proof
      });
      expect(data.approvals[0].metadata).toMatchObject({
        credits: 10,
        notes: 'Cleaned everything!',
        photoUrl: '/uploads/proof.jpg',
      });
    });

    it('should return pending reward redemptions', async () => {

      const mockRedemption = {
        id: 'xyz-456-uuid',
        status: 'PENDING',
        requestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago = HIGH priority
        member: {
          id: 'child-2',
          name: 'Bob',
          avatarUrl: '/avatars/bob.jpg',
        },
        reward: {
          name: 'Ice Cream Trip',
          costCredits: 50, // <100, not high enough for HIGH priority alone
          familyId: 'family-test-123',
        },
      };

      prismaMock.choreInstance.findMany.mockResolvedValueOnce([]);
      prismaMock.rewardRedemption.findMany.mockResolvedValueOnce([mockRedemption] as any);
      prismaMock.shoppingItem.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.total).toBe(1);
      expect(data.approvals).toHaveLength(1);
      expect(data.approvals[0]).toMatchObject({
        id: 'reward-xyz-456-uuid',
        type: 'REWARD_REDEMPTION',
        familyMemberId: 'child-2',
        familyMemberName: 'Bob',
        familyMemberAvatarUrl: '/avatars/bob.jpg',
        title: 'Ice Cream Trip',
        priority: 'HIGH', // HIGH because >24 hours old
      });
      expect(data.approvals[0].metadata).toMatchObject({
        costCredits: 50,
      });
    });

    it('should return mixed approval types sorted by date', async () => {

      const mockChore = {
        id: 'chore-uuid-2',
        status: 'COMPLETED',
        completedAt: new Date('2026-01-07T12:00:00Z'),
        assignedTo: { id: 'child-1', name: 'Alice', avatarUrl: null },
        choreSchedule: {
          choreDefinition: { name: 'Dishes', creditValue: 5, familyId: 'family-test-123' },
        },
      };

      const mockRedemption = {
        id: 'redemption-uuid-2',
        status: 'PENDING',
        requestedAt: new Date('2026-01-07T10:00:00Z'), // Earlier
        member: { id: 'child-2', name: 'Bob', avatarUrl: null },
        reward: { name: 'Movie Night', costCredits: 25, familyId: 'family-test-123' },
      };

      prismaMock.choreInstance.findMany.mockResolvedValueOnce([mockChore] as any);
      prismaMock.rewardRedemption.findMany.mockResolvedValueOnce([mockRedemption] as any);
      prismaMock.shoppingItem.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.total).toBe(2);
      expect(data.approvals).toHaveLength(2);
      // Should be sorted by date (oldest first)
      expect(data.approvals[0].id).toBe('reward-redemption-uuid-2');
      expect(data.approvals[1].id).toBe('chore-chore-uuid-2');
    });

    it('should filter approvals from other families', async () => {

      const mockChoreOwnFamily = {
        id: 'own-chore-uuid',
        status: 'COMPLETED',
        completedAt: new Date(),
        assignedTo: { id: 'child-1', name: 'Alice', avatarUrl: null },
        choreSchedule: {
          choreDefinition: { name: 'Dishes', creditValue: 5, familyId: 'family-test-123' },
        },
      };

      const mockChoreOtherFamily = {
        id: 'other-chore-uuid',
        status: 'COMPLETED',
        completedAt: new Date(),
        assignedTo: { id: 'child-other', name: 'Charlie', avatarUrl: null },
        choreSchedule: {
          choreDefinition: { name: 'Laundry', creditValue: 10, familyId: 'other-family' },
        },
      };

      prismaMock.choreInstance.findMany.mockResolvedValueOnce([mockChoreOwnFamily, mockChoreOtherFamily] as any);
      prismaMock.rewardRedemption.findMany.mockResolvedValueOnce([]);
      prismaMock.shoppingItem.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/approvals');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should only include own family's chores
      expect(data.total).toBe(1);
      expect(data.approvals[0].id).toBe('chore-own-chore-uuid');
    });
  });
});
