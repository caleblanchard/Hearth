// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';
import { mockParentSession, mockChildSession, setMockSession } from '@/lib/test-utils/auth-mock';

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/family/sick-mode/end/route';

describe('/api/family/sick-mode/end', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
    mockParentSession();
  });

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
      setMockSession(null);
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
      dbMock.sickModeInstance.findUnique.mockResolvedValue(mockSickModeInstance as any);
      dbMock.sickModeInstance.update.mockResolvedValue({
        ...mockSickModeInstance,
        endedAt: new Date(),
        endedBy: 'parent-test-123',
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
      expect(data.instance.endedBy).toBe('parent-test-123');

      expect(dbMock.sickModeInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: {
          endedAt: expect.any(String),
          endedBy: 'parent-test-123',
          isActive: false,
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
      dbMock.sickModeInstance.findUnique.mockResolvedValue(null);

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
      dbMock.sickModeInstance.findUnique.mockResolvedValue({
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
      dbMock.sickModeInstance.findUnique.mockResolvedValue({
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
      dbMock.sickModeInstance.findUnique.mockResolvedValue(mockSickModeInstance as any);
      dbMock.sickModeInstance.update.mockResolvedValue({
        ...mockSickModeInstance,
        endedAt: new Date(),
        endedBy: 'parent-test-123',
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
      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'SICK_MODE_ENDED',
          entityType: 'SickModeInstance',
          entityId: 'instance-1',
          result: 'SUCCESS',
          details: {
            sickMemberId: 'child-test-123',
          },
        },
      });
    });
  });
});
