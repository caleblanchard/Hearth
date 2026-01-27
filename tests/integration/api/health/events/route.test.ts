// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/health/events/route';

describe('/api/health/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
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
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all health events for family', async () => {
      dbMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].eventType).toBe('ILLNESS');
      expect(data.events[0].severity).toBe(5);

      expect(dbMock.healthEvent.findMany).toHaveBeenCalledWith({
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
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter health events by memberId', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?memberId=child-test-123', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(dbMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          memberId: 'child-test-123',
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter health events by eventType', async () => {
      dbMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?eventType=ILLNESS', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(dbMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'ILLNESS',
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should filter to show only active events', async () => {
      dbMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events?active=true', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);

      expect(dbMock.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          endedAt: null,
        },
        include: expect.any(Object),
        orderBy: {
          startedAt: 'desc',
        },
      });
    });

    it('should allow children to view health events', async () => {
      dbMock.healthEvent.findMany.mockResolvedValue([mockHealthEvent] as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(1);
    });

    it('should verify member belongs to family when filtering by memberId', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue(null);

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
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'other-child-123',
        familyId: 'family-test-123',
        name: 'Other Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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

      expect(dbMock.healthEvent.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
          notes: 'Child has a fever',
          startedAt: expect.any(String),
        },
      });
    });

    it('should allow children to create health events for themselves', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
          memberId: 'child-test-123',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Event type must be one of: ILLNESS, INJURY, DOCTOR_VISIT, WELLNESS_CHECK, VACCINATION, OTHER');
    });

    it('should return 400 if eventType is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
          memberId: 'child-test-123',
          eventType: 'INVALID_TYPE',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Event type must be one of: ILLNESS, INJURY, DOCTOR_VISIT, WELLNESS_CHECK, VACCINATION, OTHER');
    });

    it('should return 404 if member not found', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'other-family-child',
        familyId: 'other-family-123',
        name: 'Other Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 1,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should return 400 if severity is below 1', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
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
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
          memberId: 'child-test-123',
          eventType: 'DOCTOR_VISIT',
          notes: 'Annual checkup',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(dbMock.healthEvent.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          eventType: 'DOCTOR_VISIT',
          notes: 'Annual checkup',
          severity: 2,
          startedAt: expect.any(String),
        },
      });
    });

    it('should log audit event on successful creation', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.healthEvent.create.mockResolvedValue(mockHealthEvent as any);

      const request = new NextRequest('http://localhost:3000/api/health/events', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Event',
          memberId: 'child-test-123',
          eventType: 'ILLNESS',
          severity: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'HEALTH_EVENT_CREATED',
          entityType: 'HEALTH_EVENT',
          entityId: 'event-1',
          result: 'SUCCESS',
          metadata: {
            title: 'Test Event',
            eventType: 'ILLNESS',
            targetMemberId: 'child-test-123',
          },
        },
      });
    });
  });
});
