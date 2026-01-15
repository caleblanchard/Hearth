// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/family/sick-mode/status/route';

describe('/api/family/sick-mode/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockParentSession = {
    user: {
      id: 'parent-test-123',
      familyId: 'family-test-123',
      role: 'PARENT' as const,
    },
  };

  const mockChildSession = {
    user: {
      id: 'child-test-123',
      familyId: 'family-test-123',
      role: 'CHILD' as const,
    },
  };

  const mockSickModeInstances = [
    {
      id: 'instance-1',
      familyId: 'family-test-123',
      memberId: 'child-test-123',
      startedAt: new Date('2026-01-06T10:00:00Z'),
      endedAt: null,
      endedById: null,
      triggeredBy: 'MANUAL',
      healthEventId: null,
      notes: 'Child is sick',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      member: {
        id: 'child-test-123',
        name: 'Child',
      },
    },
  ];

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/status', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all active sick mode instances for family', async () => {
      prismaMock.sickModeInstance.findMany.mockResolvedValue(mockSickModeInstances as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/status', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toHaveLength(1);
      expect(data.instances[0].isActive).toBe(true);

      expect(prismaMock.sickModeInstance.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          isActive: true,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should allow children to view sick mode status', async () => {
      prismaMock.sickModeInstance.findMany.mockResolvedValue(mockSickModeInstances as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/status', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toHaveLength(1);
    });

    it('should filter by memberId if provided', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findMany.mockResolvedValue(mockSickModeInstances as any);

      const request = new NextRequest(
        'http://localhost:3000/api/family/sick-mode/status?memberId=child-test-123',
        {
          method: 'GET',
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toHaveLength(1);

      expect(prismaMock.sickModeInstance.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          memberId: 'child-test-123',
          isActive: true,
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should return 404 if filtered member not found', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/family/sick-mode/status?memberId=non-existent',
        {
          method: 'GET',
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return empty array if no active instances', async () => {
      prismaMock.sickModeInstance.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/status', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toHaveLength(0);
    });

    it('should include all instances if includeEnded=true', async () => {
      const allInstances = [
        ...mockSickModeInstances,
        {
          ...mockSickModeInstances[0],
          id: 'instance-2',
          isActive: false,
          endedAt: new Date('2026-01-07T10:00:00Z'),
        },
      ];
      prismaMock.sickModeInstance.findMany.mockResolvedValue(allInstances as any);

      const request = new NextRequest(
        'http://localhost:3000/api/family/sick-mode/status?includeEnded=true',
        {
          method: 'GET',
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toHaveLength(2);

      expect(prismaMock.sickModeInstance.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });
  });
});
