// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/routines/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { RoutineType } from '@/app/generated/prisma';

const { auth } = require('@/lib/auth');

describe('GET /api/routines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return empty array if no routines exist', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.routine.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/routines', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routines).toEqual([]);
  });

  it('should return all family routines for parent', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutines = [
      {
        id: 'routine-1',
        familyId: session.user.familyId,
        name: 'Morning Routine',
        type: RoutineType.MORNING,
        assignedTo: null,
        isWeekday: true,
        isWeekend: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: 'step-1',
            routineId: 'routine-1',
            name: 'Brush teeth',
            icon: null,
            estimatedMinutes: null,
            sortOrder: 0,
          },
          {
            id: 'step-2',
            routineId: 'routine-1',
            name: 'Get dressed',
            icon: null,
            estimatedMinutes: null,
            sortOrder: 1,
          },
        ],
        assignee: null,
      },
      {
        id: 'routine-2',
        familyId: session.user.familyId,
        name: 'Bedtime Routine',
        type: RoutineType.BEDTIME,
        assignedTo: 'child-123',
        isWeekday: true,
        isWeekend: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
        assignee: {
          id: 'child-123',
          name: 'Test Child',
        },
      },
    ];

    prismaMock.routine.findMany.mockResolvedValue(mockRoutines as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routines).toHaveLength(2);
    expect(data.routines[0].steps).toHaveLength(2);
  });

  it('should filter routines by type', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutines = [
      {
        id: 'routine-1',
        familyId: session.user.familyId,
        name: 'Morning 1',
        type: RoutineType.MORNING,
        assignedTo: null,
        isWeekday: true,
        isWeekend: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
        assignee: null,
      },
    ];

    prismaMock.routine.findMany.mockResolvedValue(mockRoutines as any);

    const request = new Request('http://localhost/api/routines?type=MORNING', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routines).toHaveLength(1);
    expect(prismaMock.routine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'MORNING',
        }),
      })
    );
  });

  it('should filter routines by assignedTo', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutines = [
      {
        id: 'routine-1',
        familyId: session.user.familyId,
        name: 'Child Routine',
        type: RoutineType.MORNING,
        assignedTo: 'child-123',
        isWeekday: true,
        isWeekend: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
        assignee: {
          id: 'child-123',
          name: 'Test Child',
        },
      },
    ];

    prismaMock.routine.findMany.mockResolvedValue(mockRoutines as any);

    const request = new Request('http://localhost/api/routines?assignedTo=child-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routines).toHaveLength(1);
    expect(data.routines[0].assignedTo).toBe('child-123');
  });

  it('should apply OR filter for children (assigned or unassigned)', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    prismaMock.routine.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/routines', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.routine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { assignedTo: session.user.id },
            { assignedTo: null },
          ],
        }),
      })
    );
  });
});

describe('POST /api/routines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Routine',
        type: 'MORNING',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 if child attempts to create routine', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Routine',
        type: 'MORNING',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Only parents can create routines');
  });

  it('should create routine with basic fields', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutine = {
      id: 'routine-1',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      assignee: null,
    };

    prismaMock.routine.create.mockResolvedValue(mockRoutine as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Morning Routine',
        type: 'MORNING',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.routine.name).toBe('Morning Routine');
    expect(data.routine.type).toBe('MORNING');
    expect(data.routine.familyId).toBe(session.user.familyId);
  });

  it('should create routine with steps', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutine = {
      id: 'routine-1',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: 'step-1',
          routineId: 'routine-1',
          name: 'Brush teeth',
          icon: '🪥',
          estimatedMinutes: 2,
          sortOrder: 0,
        },
        {
          id: 'step-2',
          routineId: 'routine-1',
          name: 'Get dressed',
          icon: '👕',
          estimatedMinutes: 5,
          sortOrder: 1,
        },
      ],
      assignee: null,
    };

    prismaMock.routine.create.mockResolvedValue(mockRoutine as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Morning Routine',
        type: 'MORNING',
        steps: [
          { name: 'Brush teeth', icon: '🪥', estimatedMinutes: 2 },
          { name: 'Get dressed', icon: '👕', estimatedMinutes: 5 },
        ],
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.routine.steps).toHaveLength(2);
    expect(data.routine.steps[0].sortOrder).toBe(0);
    expect(data.routine.steps[1].sortOrder).toBe(1);
  });

  it('should create routine assigned to specific child', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.familyMember.findFirst.mockResolvedValue({
      id: 'child-123',
      familyId: session.user.familyId,
      name: 'Test Child',
      email: null,
      role: 'CHILD',
      age: 8,
    } as any);

    const mockRoutine = {
      id: 'routine-1',
      familyId: session.user.familyId,
      name: 'Bedtime Routine',
      type: RoutineType.BEDTIME,
      assignedTo: 'child-123',
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      assignee: {
        id: 'child-123',
        name: 'Test Child',
      },
    };

    prismaMock.routine.create.mockResolvedValue(mockRoutine as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bedtime Routine',
        type: 'BEDTIME',
        assignedTo: 'child-123',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.routine.assignedTo).toBe('child-123');
  });

  it('should create routine with weekday/weekend flags', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutine = {
      id: 'routine-1',
      familyId: session.user.familyId,
      name: 'School Morning',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      assignee: null,
    };

    prismaMock.routine.create.mockResolvedValue(mockRoutine as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'School Morning',
        type: 'MORNING',
        isWeekday: true,
        isWeekend: false,
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.routine.isWeekday).toBe(true);
    expect(data.routine.isWeekend).toBe(false);
  });

  it('should return 400 if name is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MORNING',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('name');
  });

  it('should return 400 if type is invalid', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        type: 'INVALID_TYPE',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('type');
  });

  it('should return 400 if assignedTo is not a family member', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.familyMember.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        type: 'MORNING',
        assignedTo: 'non-existent-id',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('family member');
  });

  it('should create audit log on routine creation', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRoutine = {
      id: 'routine-1',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      assignee: null,
    };

    prismaMock.routine.create.mockResolvedValue(mockRoutine as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Morning Routine',
        type: 'MORNING',
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'ROUTINE_CREATED',
        }),
      })
    );
  });
});
