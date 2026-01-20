// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/routines/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { RoutineType } from '@/app/generated/prisma';

describe('GET /api/routines/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return routine with steps', async () => {
    const session = mockParentSession();

    const mockRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: 'step-1',
          routineId: 'routine-123',
          name: 'Step 1',
          icon: null,
          estimatedMinutes: null,
          sortOrder: 0,
        },
        {
          id: 'step-2',
          routineId: 'routine-123',
          name: 'Step 2',
          icon: null,
          estimatedMinutes: null,
          sortOrder: 1,
        },
      ],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(mockRoutine as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routine.id).toBe('routine-123');
    expect(data.routine.name).toBe('Test Routine');
    expect(data.routine.steps).toHaveLength(2);
  });

  it('should return 404 if routine not found', async () => {
    const session = mockParentSession();

    dbMock.routine.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines/non-existent-id', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if routine belongs to different family', async () => {
    const session = mockParentSession();

    const mockRoutine = {
      id: 'routine-123',
      familyId: 'different-family-id',
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(mockRoutine as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(403);
  });
});

describe('PUT /api/routines/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 if child attempts to update routine', async () => {
    const session = mockChildSession();

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(403);
  });

  it('should update routine name', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Original Name',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRoutine = {
      ...existingRoutine,
      name: 'Updated Name',
      steps: [],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routine.update.mockResolvedValue(updatedRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routine.name).toBe('Updated Name');
  });

  it('should update routine steps', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRoutine = {
      ...existingRoutine,
      steps: [
        {
          id: 'step-new-1',
          routineId: 'routine-123',
          name: 'New Step 1',
          icon: '🌟',
          estimatedMinutes: 5,
          sortOrder: 0,
        },
        {
          id: 'step-new-2',
          routineId: 'routine-123',
          name: 'New Step 2',
          icon: '✨',
          estimatedMinutes: 10,
          sortOrder: 1,
        },
      ],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routineStep.deleteMany.mockResolvedValue({ count: 0 } as any);
    dbMock.routine.update.mockResolvedValue(updatedRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: [
          { name: 'New Step 1', icon: '🌟', estimatedMinutes: 5 },
          { name: 'New Step 2', icon: '✨', estimatedMinutes: 10 },
        ],
      }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routine.steps).toHaveLength(2);
    expect(dbMock.routineStep.deleteMany).toHaveBeenCalledWith({
      where: { routineId: 'routine-123' },
    });
  });

  it('should update assignedTo field', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRoutine = {
      ...existingRoutine,
      assignedTo: 'child-123',
      steps: [],
      assignee: {
        id: 'child-123',
        name: 'Test Child',
      },
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.familyMember.findFirst.mockResolvedValue({
      id: 'child-123',
      familyId: session.user.familyId,
      name: 'Test Child',
      email: null,
      role: 'CHILD',
      age: 8,
    } as any);
    dbMock.routine.update.mockResolvedValue(updatedRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: 'child-123' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routine.assignedTo).toBe('child-123');
  });

  it('should update weekday/weekend flags', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRoutine = {
      ...existingRoutine,
      isWeekday: true,
      isWeekend: false,
      steps: [],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routine.update.mockResolvedValue(updatedRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isWeekday: true,
        isWeekend: false,
      }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routine.isWeekday).toBe(true);
    expect(data.routine.isWeekend).toBe(false);
  });

  it('should return 404 if routine not found', async () => {
    const session = mockParentSession();

    dbMock.routine.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines/non-existent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent-id' }) });

    expect(response.status).toBe(404);
  });

  it('should create audit log on update', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Original Name',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRoutine = {
      ...existingRoutine,
      name: 'Updated Name',
      steps: [],
      assignee: null,
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routine.update.mockResolvedValue(updatedRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'ROUTINE_UPDATED',
        }),
      })
    );
  });
});

describe('DELETE /api/routines/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 if child attempts to delete routine', async () => {
    const session = mockChildSession();

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(403);
  });

  it('should delete routine and related steps', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routine.delete.mockResolvedValue(existingRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('deleted');

    expect(dbMock.routine.delete).toHaveBeenCalledWith({
      where: { id: 'routine-123' },
    });
  });

  it('should return 404 if routine not found', async () => {
    const session = mockParentSession();

    dbMock.routine.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines/non-existent-id', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });

    expect(response.status).toBe(404);
  });

  it('should create audit log on deletion', async () => {
    const session = mockParentSession();

    const existingRoutine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Test Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbMock.routine.findUnique.mockResolvedValue(existingRoutine as any);
    dbMock.routine.delete.mockResolvedValue(existingRoutine as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123', {
      method: 'DELETE',
    }) as NextRequest;

    await DELETE(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'ROUTINE_DELETED',
        }),
      })
    );
  });
});
