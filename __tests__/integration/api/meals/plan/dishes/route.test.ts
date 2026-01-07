/**
 * Integration tests for POST /api/meals/plan/dishes
 * Add a dish to an existing meal entry
 */

// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/meals/plan/dishes/route';
import { mockParentSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('POST /api/meals/plan/dishes', () => {
  const familyId = 'family-test-123';
  const userId = 'parent-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    it('should return 400 if mealEntryId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Meal entry ID is required');
    });

    it('should return 400 if dishName is missing and no recipeId', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Either dishName or recipeId is required');
    });

    it('should return 404 if meal entry does not exist', async () => {
      prismaMock.mealPlanEntry.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Meal entry not found');
    });

    it('should return 403 if meal entry belongs to different family', async () => {
      prismaMock.mealPlanEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        mealPlanId: 'plan-1',
        date: new Date(),
        mealType: 'DINNER',
        recipeId: null,
        customName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        mealPlan: {
          id: 'plan-1',
          familyId: 'different-family',
          weekStart: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 404 if recipe does not exist', async () => {
      prismaMock.mealPlanEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        mealPlanId: 'plan-1',
        date: new Date(),
        mealType: 'DINNER',
        recipeId: null,
        customName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        mealPlan: {
          id: 'plan-1',
          familyId,
          weekStart: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          recipeId: 'recipe-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Recipe not found');
    });
  });

  describe('Creating Dishes', () => {
    const mockMealEntry = {
      id: 'entry-1',
      mealPlanId: 'plan-1',
      date: new Date(),
      mealType: 'DINNER',
      recipeId: null,
      customName: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealPlan: {
        id: 'plan-1',
        familyId,
        weekStart: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any;

    it('should create a dish with custom name', async () => {
      prismaMock.mealPlanEntry.findUnique.mockResolvedValue(mockMealEntry);
      prismaMock.mealPlanDish.count.mockResolvedValue(0);
      prismaMock.mealPlanDish.create.mockResolvedValue({
        id: 'dish-1',
        mealEntryId: 'entry-1',
        recipeId: null,
        dishName: 'Spaghetti',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dish).toBeDefined();
      expect(data.dish.dishName).toBe('Spaghetti');
      expect(data.dish.recipeId).toBeNull();
      expect(data.dish.sortOrder).toBe(0);

      expect(prismaMock.mealPlanDish.create).toHaveBeenCalledWith({
        data: {
          mealEntryId: 'entry-1',
          recipeId: null,
          dishName: 'Spaghetti',
          sortOrder: 0,
        },
      });
    });

    it('should create a dish with recipe and copy recipe name', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        familyId,
        name: 'Spaghetti Carbonara',
        description: 'Classic Italian',
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 4,
        difficulty: 'MEDIUM',
        imageUrl: null,
        sourceUrl: null,
        instructions: '[]',
        notes: null,
        isFavorite: false,
        category: 'DINNER',
        dietaryTags: [],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.mealPlanEntry.findUnique.mockResolvedValue(mockMealEntry);
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe);
      prismaMock.mealPlanDish.count.mockResolvedValue(1);
      prismaMock.mealPlanDish.create.mockResolvedValue({
        id: 'dish-2',
        mealEntryId: 'entry-1',
        recipeId: 'recipe-1',
        dishName: 'Spaghetti Carbonara',
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          recipeId: 'recipe-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dish).toBeDefined();
      expect(data.dish.dishName).toBe('Spaghetti Carbonara');
      expect(data.dish.recipeId).toBe('recipe-1');
      expect(data.dish.sortOrder).toBe(1);

      expect(prismaMock.mealPlanDish.create).toHaveBeenCalledWith({
        data: {
          mealEntryId: 'entry-1',
          recipeId: 'recipe-1',
          dishName: 'Spaghetti Carbonara',
          sortOrder: 1,
        },
      });
    });

    it('should override recipe name if dishName is provided', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        familyId,
        name: 'Spaghetti Carbonara',
        description: 'Classic Italian',
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 4,
        difficulty: 'MEDIUM',
        imageUrl: null,
        sourceUrl: null,
        instructions: '[]',
        notes: null,
        isFavorite: false,
        category: 'DINNER',
        dietaryTags: [],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.mealPlanEntry.findUnique.mockResolvedValue(mockMealEntry);
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe);
      prismaMock.mealPlanDish.count.mockResolvedValue(0);
      prismaMock.mealPlanDish.create.mockResolvedValue({
        id: 'dish-1',
        mealEntryId: 'entry-1',
        recipeId: 'recipe-1',
        dishName: 'Custom Carbonara',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          recipeId: 'recipe-1',
          dishName: 'Custom Carbonara',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dish.dishName).toBe('Custom Carbonara');

      expect(prismaMock.mealPlanDish.create).toHaveBeenCalledWith({
        data: {
          mealEntryId: 'entry-1',
          recipeId: 'recipe-1',
          dishName: 'Custom Carbonara',
          sortOrder: 0,
        },
      });
    });

    it('should calculate correct sortOrder based on existing dishes', async () => {
      prismaMock.mealPlanEntry.findUnique.mockResolvedValue(mockMealEntry);
      prismaMock.mealPlanDish.count.mockResolvedValue(3);
      prismaMock.mealPlanDish.create.mockResolvedValue({
        id: 'dish-4',
        mealEntryId: 'entry-1',
        recipeId: null,
        dishName: 'Side Dish',
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Side Dish',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dish.sortOrder).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaMock.mealPlanEntry.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/plan/dishes', {
        method: 'POST',
        body: JSON.stringify({
          mealEntryId: 'entry-1',
          dishName: 'Spaghetti',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create dish');
    });
  });
});
