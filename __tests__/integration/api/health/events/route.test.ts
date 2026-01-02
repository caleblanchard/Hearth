// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/health/events/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/health/events', () => {
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
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all health events for family', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].eventType).toBe('ILLNESS');
      expect(data.events[0].severity).toBe(5);

      expect(prismaMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: 'family-test-123',
          },
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
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter health events by memberId', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?memberId=child-test-123', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(prismaMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          memberId: 'child-test-123',
          member: {
            familyId: 'family-test-123',
          },
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter health events by eventType', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?eventType=ILLNESS', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(prismaMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'ILLNESS',
          member: {
            familyId: 'family-test-123',
          },
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter to show only active events', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?active=true', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(prismaMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          endedAt: null,
          member: {
            familyId: 'family-test-123',
          },
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should allow children to view health events', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);
      prismaMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);
    });

    it('should verify member belongs to family when filtering by memberId', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events?memberId=other-family-member', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
          notes: 'Child has a fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to create health event for another member', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-child-123',
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Children can only create health events for themselves');
    });

    it('should allow parents to create health events for any family member', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
          notes: 'Child has a fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.event.eventType).toBe('ILLNESS');

      expect(prismaMock.healthEvent.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
          notes: 'Child has a fever',
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          symptoms: true,
          medications: true,
        },
      });
    });

    it('should allow children to create health events for themselves', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
          notes: 'I have a fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.event.eventType).toBe('ILLNESS');
    });

    it('should return 400 if memberId is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member ID is required');
    });

    it('should return 400 if eventType is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Event type is required');
    });

    it('should return 400 if eventType is invalid', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'INVALID_TYPE',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid event type');
    });

    it('should return 404 if member not found', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'non-existent-member',
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 404 if member belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'other-family-child',
        familyId: 'other-family-123',
        name: 'Other Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-family-child',
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should accept optional severity within valid range (1-10)', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 1,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should return 400 if severity is below 1', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Severity must be between 1 and 10');
    });

    it('should return 400 if severity is above 10', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 11,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Severity must be between 1 and 10');
    });

    it('should accept optional notes', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'DOCTOR_VISIT',
          notes: 'Annual checkup',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.healthEvent.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          eventType: 'DOCTOR_VISIT',
          notes: 'Annual checkup',
        },
        include: expect.any(Object),
      });
    });

    it('should log audit event on successful creation', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'HEALTH_EVENT_CREATED',
          entityType: 'HealthEvent',
          entityId: 'event-1',
          result: 'SUCCESS',
        },
      });
    });
  });
});
