// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { DELETE, PATCH } from '@/app/api/meals/plan/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { MealType } from '@/app/generated/prisma';

describe('DELETE /api/meals/plan/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if meal entry not found', async () => {
    const session = mockParentSession();

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if entry belongs to different family', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: 'different-family-id',
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(403);
  });

  it('should delete meal entry successfully', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.delete.mockResolvedValue(existingEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(200);
    expect(prismaMock.mealPlanEntry.delete).toHaveBeenCalledWith({
      where: { id: 'entry-123' },
    });
  });

  it('should create audit log on deletion', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.delete.mockResolvedValue(existingEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'MEAL_ENTRY_DELETED',
        }),
      })
    );
  });

  it('should allow children to delete meal entries', async () => {
    const session = mockChildSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Cereal',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.delete.mockResolvedValue(existingEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/meals/plan/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customName: 'Updated meal' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if meal entry not found', async () => {
    const session = mockParentSession();

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customName: 'Updated meal' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if entry belongs to different family', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: 'different-family-id',
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customName: 'Updated meal' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(403);
  });

  it('should update meal entry successfully', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const updatedEntry = {
      ...existingEntry,
      customName: 'Waffles',
      notes: 'With strawberries',
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.update.mockResolvedValue(updatedEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customName: 'Waffles',
        notes: 'With strawberries',
      }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entry.customName).toBe('Waffles');
    expect(data.entry.notes).toBe('With strawberries');
  });

  it('should create audit log on update', async () => {
    const session = mockParentSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.update.mockResolvedValue(existingEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customName: 'Waffles' }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'MEAL_ENTRY_UPDATED',
        }),
      })
    );
  });

  it('should allow children to update meal entries', async () => {
    const session = mockChildSession();

    const existingEntry = {
      id: 'entry-123',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Cereal',
      notes: null,
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId: session.user.familyId,
        weekStart: new Date('2026-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    prismaMock.mealPlanEntry.findUnique.mockResolvedValue(existingEntry as any);
    prismaMock.mealPlanEntry.update.mockResolvedValue(existingEntry as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan/entry-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'With milk' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'entry-123' }) });

    expect(response.status).toBe(200);
  });
});
