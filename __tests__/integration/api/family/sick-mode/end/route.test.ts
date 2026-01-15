// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/family/sick-mode/end/route';

describe('/api/family/sick-mode/end', () => {
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

  const mockSickModeInstance = {
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
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should allow parents to end sick mode', async () => {
      prismaMock.sickModeInstance.findUnique.mockResolvedValue(mockSickModeInstance as any);
      prismaMock.sickModeInstance.update.mockResolvedValue({
        ...mockSickModeInstance,
        endedAt: new Date(),
        endedById: 'parent-test-123',
        isActive: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instance.isActive).toBe(false);
      expect(data.instance.endedById).toBe('parent-test-123');

      expect(prismaMock.sickModeInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: {
          endedAt: expect.any(Date),
          endedById: 'parent-test-123',
          isActive: false,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should return 400 if instanceId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Instance ID is required');
    });

    it('should return 404 if instance not found', async () => {
      prismaMock.sickModeInstance.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'non-existent-instance',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sick mode instance not found');
    });

    it('should return 404 if instance belongs to different family', async () => {
      prismaMock.sickModeInstance.findUnique.mockResolvedValue({
        ...mockSickModeInstance,
        familyId: 'other-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sick mode instance not found');
    });

    it('should return 409 if sick mode already ended', async () => {
      prismaMock.sickModeInstance.findUnique.mockResolvedValue({
        ...mockSickModeInstance,
        isActive: false,
        endedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Sick mode is already ended');
    });

    it('should log audit event on successful end', async () => {
      prismaMock.sickModeInstance.findUnique.mockResolvedValue(mockSickModeInstance as any);
      prismaMock.sickModeInstance.update.mockResolvedValue({
        ...mockSickModeInstance,
        endedAt: new Date(),
        endedById: 'parent-test-123',
        isActive: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/end', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: 'instance-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'SICK_MODE_ENDED',
          entityType: 'SickModeInstance',
          entityId: 'instance-1',
          result: 'SUCCESS',
          metadata: {
            sickMemberId: 'child-test-123',
          },
        },
      });
    });
  });
});
