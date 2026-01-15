// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/routines/completions/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { RoutineType } from '@/app/generated/prisma';

describe('GET /api/routines/completions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return empty array if no completions exist', async () => {
    const session = mockParentSession();

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.completions).toEqual([]);
  });

  it('should return all family completions for parent', async () => {
    const session = mockParentSession();

    const mockCompletions = [
      {
        id: 'completion-1',
        routineId: 'routine-1',
        memberId: 'child-1',
        completedAt: new Date('2026-01-01T08:00:00Z'),
        date: new Date('2026-01-01'),
        routine: {
          id: 'routine-1',
          name: 'Morning Routine',
          type: RoutineType.MORNING,
          familyId: session.user.familyId,
        },
        member: {
          id: 'child-1',
          name: 'Test Child 1',
        },
      },
      {
        id: 'completion-2',
        routineId: 'routine-2',
        memberId: 'child-2',
        completedAt: new Date('2026-01-01T20:00:00Z'),
        date: new Date('2026-01-01'),
        routine: {
          id: 'routine-2',
          name: 'Bedtime Routine',
          type: RoutineType.BEDTIME,
          familyId: session.user.familyId,
        },
        member: {
          id: 'child-2',
          name: 'Test Child 2',
        },
      },
    ];

    prismaMock.routineCompletion.findMany.mockResolvedValue(mockCompletions as any);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.completions).toHaveLength(2);
    expect(data.completions[0].routine.name).toBe('Morning Routine');
  });

  it('should return only own completions for child', async () => {
    const session = mockChildSession();

    const mockCompletions = [
      {
        id: 'completion-1',
        routineId: 'routine-1',
        memberId: session.user.id,
        completedAt: new Date('2026-01-01T08:00:00Z'),
        date: new Date('2026-01-01'),
        routine: {
          id: 'routine-1',
          name: 'Morning Routine',
          type: RoutineType.MORNING,
          familyId: session.user.familyId,
        },
        member: {
          id: session.user.id,
          name: session.user.name,
        },
      },
    ];

    prismaMock.routineCompletion.findMany.mockResolvedValue(mockCompletions as any);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.completions).toHaveLength(1);
    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: session.user.id,
        }),
      })
    );
  });

  it('should filter completions by memberId for parent', async () => {
    const session = mockParentSession();

    const mockCompletions = [
      {
        id: 'completion-1',
        routineId: 'routine-1',
        memberId: 'child-123',
        completedAt: new Date(),
        date: new Date(),
        routine: {
          id: 'routine-1',
          name: 'Morning Routine',
          type: RoutineType.MORNING,
          familyId: session.user.familyId,
        },
        member: {
          id: 'child-123',
          name: 'Test Child',
        },
      },
    ];

    prismaMock.routineCompletion.findMany.mockResolvedValue(mockCompletions as any);

    const request = new Request('http://localhost/api/routines/completions?memberId=child-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.completions).toHaveLength(1);
    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: 'child-123',
        }),
      })
    );
  });

  it('should filter completions by routineId', async () => {
    const session = mockParentSession();

    const mockCompletions = [
      {
        id: 'completion-1',
        routineId: 'routine-123',
        memberId: 'child-1',
        completedAt: new Date(),
        date: new Date(),
        routine: {
          id: 'routine-123',
          name: 'Morning Routine',
          type: RoutineType.MORNING,
          familyId: session.user.familyId,
        },
        member: {
          id: 'child-1',
          name: 'Test Child',
        },
      },
    ];

    prismaMock.routineCompletion.findMany.mockResolvedValue(mockCompletions as any);

    const request = new Request('http://localhost/api/routines/completions?routineId=routine-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          routineId: 'routine-123',
        }),
      })
    );
  });

  it('should filter completions by date range', async () => {
    const session = mockParentSession();

    const startDate = '2026-01-01';
    const endDate = '2026-01-07';

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);

    const request = new Request(
      `http://localhost/api/routines/completions?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
      }
    ) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    );
  });

  it('should support pagination with limit and offset', async () => {
    const session = mockParentSession();

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);
    prismaMock.routineCompletion.count.mockResolvedValue(50);

    const request = new Request(
      'http://localhost/api/routines/completions?limit=10&offset=20',
      {
        method: 'GET',
      }
    ) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.total).toBe(50);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.offset).toBe(20);
    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('should default to limit 50 if not specified', async () => {
    const session = mockParentSession();

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);
    prismaMock.routineCompletion.count.mockResolvedValue(100);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it('should order completions by most recent first', async () => {
    const session = mockParentSession();

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);
    prismaMock.routineCompletion.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          completedAt: 'desc',
        },
      })
    );
  });

  it('should include routine and member details', async () => {
    const session = mockParentSession();

    prismaMock.routineCompletion.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/routines/completions', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.routineCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          routine: expect.objectContaining({
            select: expect.any(Object),
          }),
          member: expect.objectContaining({
            select: expect.any(Object),
          }),
        }),
      })
    );
  });
});
