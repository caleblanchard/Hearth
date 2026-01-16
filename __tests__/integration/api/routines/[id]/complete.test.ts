// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/routines/[id]/complete/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { RoutineType } from '@/app/generated/prisma';

describe('POST /api/routines/[id]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if routine not found', async () => {
    const session = mockChildSession();

    prismaMock.routine.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  it('should return 403 if routine belongs to different family', async () => {
    const session = mockChildSession();

    const routine = {
      id: 'routine-123',
      familyId: 'different-family-id',
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(403);
  });

  it('should return 403 if routine is assigned to different child', async () => {
    const session = mockChildSession();

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: 'different-child-id',
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('not assigned');
  });

  it('should complete routine for child when assigned to them', async () => {
    const session = mockChildSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: session.user.id,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const completion = {
      id: 'completion-1',
      routineId: 'routine-123',
      memberId: session.user.id,
      completedAt: new Date(),
      date: today,
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);
    prismaMock.routineCompletion.create.mockResolvedValue(completion as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.completion.routineId).toBe('routine-123');
    expect(data.completion.memberId).toBe(session.user.id);
    expect(data.message).toContain('completed');
  });

  it('should complete unassigned routine for any child', async () => {
    const session = mockChildSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null, // Unassigned, available to all
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const completion = {
      id: 'completion-1',
      routineId: 'routine-123',
      memberId: session.user.id,
      completedAt: new Date(),
      date: today,
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);
    prismaMock.routineCompletion.create.mockResolvedValue(completion as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(201);
  });

  it('should allow parent to complete routine on behalf of child', async () => {
    const session = mockParentSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: 'child-123',
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const completion = {
      id: 'completion-1',
      routineId: 'routine-123',
      memberId: 'child-123',
      completedAt: new Date(),
      date: today,
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);
    prismaMock.familyMember.findFirst.mockResolvedValue({
      id: 'child-123',
      familyId: session.user.familyId,
      name: 'Test Child',
      email: null,
      role: 'CHILD',
      age: 8,
    } as any);
    prismaMock.routineCompletion.create.mockResolvedValue(completion as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'child-123' }),
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.completion.memberId).toBe('child-123');
  });

  it('should return 400 if parent specifies non-existent member', async () => {
    const session = mockParentSession();

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);
    prismaMock.familyMember.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'non-existent' }),
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('family member');
  });

  it('should handle duplicate completion gracefully', async () => {
    const session = mockChildSession();

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: session.user.id,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);

    // Simulate unique constraint violation
    const prismaError = new Error('Unique constraint failed');
    (prismaError as any).code = 'P2002';
    prismaMock.routineCompletion.create.mockRejectedValue(prismaError);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already completed');
  });

  it('should create audit log on completion', async () => {
    const session = mockChildSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routine = {
      id: 'routine-123',
      familyId: session.user.familyId,
      name: 'Morning Routine',
      type: RoutineType.MORNING,
      assignedTo: session.user.id,
      isWeekday: true,
      isWeekend: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const completion = {
      id: 'completion-1',
      routineId: 'routine-123',
      memberId: session.user.id,
      completedAt: new Date(),
      date: today,
    };

    prismaMock.routine.findUnique.mockResolvedValue(routine as any);
    prismaMock.routineCompletion.create.mockResolvedValue(completion as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/routines/routine-123/complete', {
      method: 'POST',
    }) as NextRequest;

    await POST(request, { params: Promise.resolve({ id: 'routine-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          action: 'ROUTINE_COMPLETED',
        }),
      })
    );
  });
});
