// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/meals/plan/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { MealType } from '@/app/generated/prisma';

const { auth } = require('@/lib/auth');

describe('GET /api/meals/plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan?week=2026-01-06', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 if week parameter is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/week parameter is required/i);
  });

  it('should return 400 if week parameter is invalid date', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan?week=invalid-date', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/invalid date/i);
  });

  it('should return empty meal plan if none exists for week', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.findUnique.mockResolvedValue(null);

    // Tuesday 2026-01-06 should normalize to Monday 2026-01-05
    const request = new Request('http://localhost/api/meals/plan?week=2026-01-06', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mealPlan).toBeNull();
    expect(data.weekStart).toBe('2026-01-05'); // Monday of that week
  });

  it('should return meal plan with entries for the week', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const weekStart = new Date('2026-01-06');
    const mockMealPlan = {
      id: 'plan-1',
      familyId: session.user.familyId,
      weekStart,
      createdAt: new Date(),
      updatedAt: new Date(),
      meals: [
        {
          id: 'entry-1',
          mealPlanId: 'plan-1',
          date: new Date('2026-01-06'),
          mealType: MealType.BREAKFAST,
          customName: 'Pancakes',
          notes: 'With maple syrup',
          recipeId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entry-2',
          mealPlanId: 'plan-1',
          date: new Date('2026-01-06'),
          mealType: MealType.DINNER,
          customName: 'Spaghetti',
          notes: null,
          recipeId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    prismaMock.mealPlan.findUnique.mockResolvedValue(mockMealPlan as any);

    const request = new Request('http://localhost/api/meals/plan?week=2026-01-06', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mealPlan.id).toBe('plan-1');
    expect(data.mealPlan.meals).toHaveLength(2);
    expect(data.mealPlan.meals[0].customName).toBe('Pancakes');
  });

  it('should normalize week start to Monday', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.findUnique.mockResolvedValue(null);

    // Wednesday 2026-01-07, should normalize to Monday 2026-01-05
    const request = new Request('http://localhost/api/meals/plan?week=2026-01-07', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    // Should return Monday of that week
    expect(data.weekStart).toBe('2026-01-05');

    expect(prismaMock.mealPlan.findUnique).toHaveBeenCalledWith({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId,
          weekStart: new Date('2026-01-05T00:00:00.000Z'),
        },
      },
      include: {
        meals: {
          include: {
            dishes: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: [
            { date: 'asc' },
            { mealType: 'asc' },
          ],
        },
      },
    });
  });

  it('should not return meal plans from other families', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan?week=2026-01-06', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.mealPlan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyId_weekStart: expect.objectContaining({
            familyId: session.user.familyId,
          }),
        }),
      })
    );
  });

  it('should allow children to view meal plans', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan?week=2026-01-06', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});

describe('POST /api/meals/plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 if date is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/date is required/i);
  });

  it('should return 400 if mealType is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/meal type is required/i);
  });

  it('should return 400 if meal type is invalid', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'INVALID_TYPE',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/invalid meal type/i);
  });

  it('should return 400 if neither customName nor recipeId provided', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/customName.*recipeId.*dishes/i);
  });

  it('should create meal plan entry successfully', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const weekStart = new Date('2026-01-05');
    const mockMealPlan = {
      id: 'plan-1',
      familyId: session.user.familyId,
      weekStart,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockEntry = {
      id: 'entry-1',
      mealPlanId: 'plan-1',
      date: new Date('2026-01-06'),
      mealType: MealType.BREAKFAST,
      customName: 'Pancakes',
      notes: 'With syrup',
      recipeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.mealPlan.upsert.mockResolvedValue(mockMealPlan as any);
    prismaMock.mealPlanEntry.create.mockResolvedValue(mockEntry as any);
    prismaMock.mealPlanEntry.findUnique.mockResolvedValue({
      ...mockEntry,
      dishes: [],
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
        notes: 'With syrup',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.entry.customName).toBe('Pancakes');
    expect(data.entry.mealType).toBe('BREAKFAST');
  });

  it('should create meal plan if it does not exist for week', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const weekStart = new Date('2026-01-05');
    const mockMealPlan = {
      id: 'plan-1',
      familyId: session.user.familyId,
      weekStart,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.mealPlan.upsert.mockResolvedValue(mockMealPlan as any);
    prismaMock.mealPlanEntry.create.mockResolvedValue({} as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.mealPlan.upsert).toHaveBeenCalledWith({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId,
          weekStart,
        },
      },
      create: {
        familyId: session.user.familyId,
        weekStart,
      },
      update: {},
    });
  });

  it('should create audit log on entry creation', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.upsert.mockResolvedValue({ id: 'plan-1' } as any);
    prismaMock.mealPlanEntry.create.mockResolvedValue({
      id: 'entry-1',
      mealType: MealType.BREAKFAST,
      date: new Date('2026-01-06')
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'MEAL_ENTRY_ADDED',
          familyId: session.user.familyId,
          memberId: session.user.id,
        }),
      })
    );
  });

  it('should allow parents to create meal entries', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.upsert.mockResolvedValue({ id: 'plan-1' } as any);
    prismaMock.mealPlanEntry.create.mockResolvedValue({
      id: 'entry-1',
      mealType: MealType.BREAKFAST,
      date: new Date('2026-01-06')
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Pancakes',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('should allow children to create meal entries', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    prismaMock.mealPlan.upsert.mockResolvedValue({ id: 'plan-1' } as any);
    prismaMock.mealPlanEntry.create.mockResolvedValue({
      id: 'entry-1',
      mealType: MealType.BREAKFAST,
      date: new Date('2026-01-06')
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-01-06',
        mealType: 'BREAKFAST',
        customName: 'Cereal',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('should handle all meal types', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

    for (const mealType of mealTypes) {
      jest.clearAllMocks();
      prismaMock.mealPlan.upsert.mockResolvedValue({ id: 'plan-1' } as any);
      prismaMock.mealPlanEntry.create.mockResolvedValue({
        id: 'entry-1',
        mealType: MealType.BREAKFAST,
        date: new Date('2026-01-06')
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/meals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2026-01-06',
          mealType,
          customName: 'Test meal',
        }),
      }) as NextRequest;

      const response = await POST(request);

      expect(response.status).toBe(201);
    }
  });
});
