// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/transport/today/route';

describe('/api/transport/today', () => {
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

  const mockSchedules = [
    {
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
      member: {
        id: 'child-test-123',
        name: 'Johnny',
      },
      location: {
        id: 'location-1',
        name: 'Elementary School',
        address: '123 School St',
      },
      driver: {
        id: 'driver-1',
        name: 'Mom',
        phone: '555-1234',
      },
      carpool: null,
    },
    {
      id: 'schedule-2',
      familyId: 'family-test-123',
      memberId: 'child-test-123',
      dayOfWeek: 1,
      time: '15:30',
      type: 'DROPOFF',
      locationId: 'location-1',
      driverId: 'driver-2',
      carpoolId: 'carpool-1',
      notes: null,
      isActive: true,
      member: {
        id: 'child-test-123',
        name: 'Johnny',
      },
      location: {
        id: 'location-1',
        name: 'Elementary School',
      },
      driver: {
        id: 'driver-2',
        name: 'Dad',
      },
      carpool: {
        id: 'carpool-1',
        name: 'Soccer Carpool',
      },
    },
  ];

  it('should return 401 if not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/transport/today', {
      method: 'GET',
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return today\'s transport schedules', async () => {
    // Mock Date to return Monday (day 1)
    const mockDate = new Date('2026-01-05T10:00:00Z'); // Monday
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    prismaMock.transportSchedule.findMany.mockResolvedValue(mockSchedules as any);

    const request = new NextRequest('http://localhost:3000/api/transport/today', {
      method: 'GET',
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.schedules).toHaveLength(2);
    expect(data.schedules[0].time).toBe('08:00');
    expect(data.schedules[1].time).toBe('15:30');

    expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        dayOfWeek: 1, // Monday
        isActive: true,
      },
      include: {
        member: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, address: true } },
        driver: { select: { id: true, name: true, phone: true, relationship: true } },
        carpool: { select: { id: true, name: true } },
      },
      orderBy: { time: 'asc' },
    });

    jest.restoreAllMocks();
  });

  it('should filter by member ID if provided', async () => {
    const mockDate = new Date('2026-01-05T10:00:00Z'); // Monday
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    prismaMock.transportSchedule.findMany.mockResolvedValue([mockSchedules[0]] as any);

    const request = new NextRequest('http://localhost:3000/api/transport/today?memberId=child-test-123', {
      method: 'GET',
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        dayOfWeek: 1,
        memberId: 'child-test-123',
        isActive: true,
      },
      include: expect.any(Object),
      orderBy: { time: 'asc' },
    });

    jest.restoreAllMocks();
  });

  it('should return empty array if no schedules for today', async () => {
    const mockDate = new Date('2026-01-05T10:00:00Z'); // Monday
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    prismaMock.transportSchedule.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/transport/today', {
      method: 'GET',
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.schedules).toHaveLength(0);

    jest.restoreAllMocks();
  });

  it('should handle different days of week correctly', async () => {
    // Mock Date to return Sunday (day 0)
    const mockDate = new Date('2026-01-04T10:00:00Z'); // Sunday
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    prismaMock.transportSchedule.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/transport/today', {
      method: 'GET',
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.transportSchedule.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        dayOfWeek: 0, // Sunday
        isActive: true,
      },
      include: expect.any(Object),
      orderBy: { time: 'asc' },
    });

    jest.restoreAllMocks();
  });
});
