// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/transport/schedules/[id]/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/transport/schedules/[id]', () => {
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
    dayOfWeek: 1,
    time: '08:00',
    type: 'PICKUP',
    locationId: 'location-1',
    driverId: 'driver-1',
    carpoolId: null,
    notes: 'Be ready by 7:55',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: {
      id: 'location-1',
      name: 'Elementary School',
    },
    driver: {
      id: 'driver-1',
      name: 'Mom',
    },
    member: {
      id: 'child-test-123',
      name: 'Johnny',
    },
  };

  describe('GET /api/transport/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if schedule not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Transport schedule not found');
    });

    it('should return 403 if schedule belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue({
        ...mockSchedule,
        familyId: 'other-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return schedule successfully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(mockSchedule as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.schedule.id).toBe('schedule-1');
    });
  });

  describe('PATCH /api/transport/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '09:00' }),
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '09:00' }),
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update transport schedules');
    });

    it('should return 404 if schedule not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '09:00' }),
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if schedule belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue({
        ...mockSchedule,
        familyId: 'other-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '09:00' }),
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(403);
    });

    it('should update schedule successfully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(mockSchedule as any);

      const updatedSchedule = { ...mockSchedule, time: '09:00', notes: 'New time!' };
      prismaMock.transportSchedule.update.mockResolvedValue(updatedSchedule as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '09:00', notes: 'New time!' }),
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.schedule.time).toBe('09:00');
      expect(data.message).toBe('Transport schedule updated successfully');

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'TRANSPORT_SCHEDULE_UPDATED',
          result: 'SUCCESS',
          metadata: {
            scheduleId: 'schedule-1',
          },
        },
      });
    });

    it('should return 400 if trying to update with invalid dayOfWeek', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(mockSchedule as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ dayOfWeek: 8 }), // Invalid
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(400);
    });

    it('should return 400 if trying to update with invalid time format', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(mockSchedule as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ time: '25:99' }), // Invalid
      });
      const response = await PATCH(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/transport/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(403);
    });

    it('should return 404 if schedule not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(404);
    });

    it('should delete schedule successfully (soft delete)', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.transportSchedule.findUnique.mockResolvedValue(mockSchedule as any);
      prismaMock.transportSchedule.update.mockResolvedValue({
        ...mockSchedule,
        isActive: false,
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/schedules/schedule-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'schedule-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Transport schedule deleted successfully');

      expect(prismaMock.transportSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { isActive: false },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'TRANSPORT_SCHEDULE_DELETED',
          result: 'SUCCESS',
          metadata: {
            scheduleId: 'schedule-1',
          },
        },
      });
    });
  });
});
