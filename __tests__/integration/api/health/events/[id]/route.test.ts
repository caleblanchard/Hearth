// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/health/events/[id]/route';

describe('/api/health/events/[id]', () => {
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

  const mockHealthEvent = {
    id: 'event-1',
    memberId: 'child-test-123',
    eventType: 'ILLNESS',
    startedAt: new Date('2026-01-01T10:00:00Z'),
    endedAt: null,
    severity: 5,
    notes: 'Child has a fever',
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'child-test-123',
      name: 'Child',
      familyId: 'family-test-123',
    },
    symptoms: [
      {
        id: 'symptom-1',
        healthEventId: 'event-1',
        symptomType: 'FEVER',
        severity: 7,
        notes: 'High fever',
        recordedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ],
    medications: [
      {
        id: 'med-1',
        healthEventId: 'event-1',
        medicationName: 'Tylenol',
        dosage: '5ml',
        givenAt: new Date('2026-01-01T10:30:00Z'),
        givenBy: 'parent-test-123',
        nextDoseAt: new Date('2026-01-01T14:30:00Z'),
        notes: 'For fever',
      },
    ],
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return health event details', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.event.id).toBe('event-1');
      expect(data.event.eventType).toBe('ILLNESS');
      expect(data.event.symptoms).toHaveLength(1);
      expect(data.event.medications).toHaveLength(1);

      expect(prismaMock.healthEvent.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              familyId: true,
            },
          },
          symptoms: {
            orderBy: {
              recordedAt: 'desc',
            },
          },
          medications: {
            orderBy: {
              givenAt: 'desc',
            },
          },
        },
      });
    });

    it('should return 404 if health event not found', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events/non-existent', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Health event not found');
    });

    it('should return 404 if health event belongs to different family', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue({
        ...mockHealthEvent,
        member: {
          ...mockHealthEvent.member,
          familyId: 'other-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Health event not found');
    });

    it('should allow children to view health events', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.event.id).toBe('event-1');
    });
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to update another member\'s event', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue({
        ...mockHealthEvent,
        memberId: 'other-child-123',
        member: {
          id: 'other-child-123',
          name: 'Other Child',
          familyId: 'family-test-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Children can only update their own health events');
    });

    it('should allow parents to update any health event', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);
      prismaMock.healthEvent.update.mockResolvedValue({
        ...mockHealthEvent,
        severity: 6,
        notes: 'Fever getting worse',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
          notes: 'Fever getting worse',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.event.severity).toBe(6);

      expect(prismaMock.healthEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          severity: 6,
          notes: 'Fever getting worse',
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          symptoms: {
            orderBy: {
              recordedAt: 'desc',
            },
          },
          medications: {
            orderBy: {
              givenAt: 'desc',
            },
          },
        },
      });
    });

    it('should allow children to update their own health events', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);
      prismaMock.healthEvent.update.mockResolvedValue({
        ...mockHealthEvent,
        notes: 'Feeling a bit better',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Feeling a bit better',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.event.notes).toBe('Feeling a bit better');
    });

    it('should return 404 if health event not found', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Health event not found');
    });

    it('should return 404 if health event belongs to different family', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue({
        ...mockHealthEvent,
        member: {
          ...mockHealthEvent.member,
          familyId: 'other-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Health event not found');
    });

    it('should allow ending a health event by setting endedAt', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);
      const endedAt = new Date('2026-01-02T10:00:00Z');
      prismaMock.healthEvent.update.mockResolvedValue({
        ...mockHealthEvent,
        endedAt,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          endedAt: endedAt.toISOString(),
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.event.endedAt).toBeTruthy();

      expect(prismaMock.healthEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          endedAt,
        },
        include: expect.any(Object),
      });
    });

    it('should return 400 if severity is below 1', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 0,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Severity must be between 1 and 10');
    });

    it('should return 400 if severity is above 10', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 11,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Severity must be between 1 and 10');
    });

    it('should log audit event on successful update', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);
      prismaMock.healthEvent.update.mockResolvedValue({
        ...mockHealthEvent,
        severity: 6,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          severity: 6,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'HEALTH_EVENT_UPDATED',
          entityType: 'HealthEvent',
          entityId: 'event-1',
          result: 'SUCCESS',
        },
      });
    });

    it('should log audit event when ending a health event', async () => {
      prismaMock.healthEvent.findUnique.mockResolvedValue(mockHealthEvent as any);
      const endedAt = new Date('2026-01-02T10:00:00Z');
      prismaMock.healthEvent.update.mockResolvedValue({
        ...mockHealthEvent,
        endedAt,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events/event-1', {
        method: 'PATCH',
        body: JSON.stringify({
          endedAt: endedAt.toISOString(),
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'event-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'HEALTH_EVENT_ENDED',
          entityType: 'HealthEvent',
          entityId: 'event-1',
          result: 'SUCCESS',
        },
      });
    });
  });
});
