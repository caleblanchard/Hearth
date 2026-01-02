// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transport/schedules/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/transport/schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockSession = {
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

  const mockSchedule = {
    id: 'schedule-1',
    familyId: 'family-test-123',
    memberId: 'child-test-123',
    dayOfWeek: 1, // Monday
    time: '08:00',
    type: 'PICKUP',
    locationId: 'location-1',
    driverId: 'driver-1',
    carpoolId: null,
    notes: 'Be ready by 7:55',
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    location: {
      id: 'location-1',
      name: 'Elementary School',
      address: '123 School St',
    },
    driver: {
      id: 'driver-1',
      name: 'Mom',
      phone: '555-1234',
      relationship: 'Mom',
    },
    carpool: null,
    member: {
      id: 'child-test-123',
      name: 'Johnny',
    },
  };

  describe('GET /api/transport/schedules', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all schedules for family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findMany.mockResolvedValue([mockSchedule] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.schedules).toHaveLength(1);
      expect(data.schedules[0].id).toBe('schedule-1');
      expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123', isActive: true },
        include: {
          member: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, address: true } },
          driver: { select: { id: true, name: true, phone: true, relationship: true } },
          carpool: { select: { id: true, name: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
      });
    });

    it('should filter schedules by member ID', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findMany.mockResolvedValue([mockSchedule] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules?memberId=child-test-123', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123', memberId: 'child-test-123', isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should filter schedules by day of week', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findMany.mockResolvedValue([mockSchedule] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules?dayOfWeek=1', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123', dayOfWeek: 1, isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('POST /api/transport/schedules', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can create transport schedules');
    });

    it('should return 400 if missing required fields', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          // Missing dayOfWeek, time, type
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 if dayOfWeek is invalid', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 7, // Invalid (0-6 only)
          time: '08:00',
          type: 'PICKUP',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should return 400 if time format is invalid', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '25:00', // Invalid hour
          type: 'PICKUP',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Time must be in HH:MM format (24-hour)');
    });

    it('should return 400 if type is invalid', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'INVALID',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('type');
    });

    it('should create transport schedule successfully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);

      prismaMock.transportSchedule.create.mockResolvedValue(mockSchedule as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
          locationId: 'location-1',
          driverId: 'driver-1',
          notes: 'Be ready by 7:55',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.schedule.id).toBe('schedule-1');
      expect(data.message).toBe('Transport schedule created successfully');

      expect(prismaMock.transportSchedule.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
          locationId: 'location-1',
          driverId: 'driver-1',
          carpoolId: null,
          notes: 'Be ready by 7:55',
        },
        include: expect.any(Object),
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'TRANSPORT_SCHEDULE_CREATED',
          result: 'SUCCESS',
          metadata: {
            scheduleId: 'schedule-1',
            member: 'child-test-123',
            dayOfWeek: 1,
            time: '08:00',
            type: 'PICKUP',
          },
        },
      });
    });

    it('should return 400 if member does not belong to family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'other-family-123', // Different family
      } as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member does not belong to your family');
    });

    it('should create schedule with carpool', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);

      const scheduleWithCarpool = {
        ...mockSchedule,
        carpoolId: 'carpool-1',
      };

      prismaMock.transportSchedule.create.mockResolvedValue(scheduleWithCarpool as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          dayOfWeek: 1,
          time: '08:00',
          type: 'PICKUP',
          carpoolId: 'carpool-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.transportSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          carpoolId: 'carpool-1',
        }),
        include: expect.any(Object),
      });
    });
  });
});
