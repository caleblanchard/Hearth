// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/meals/recipes/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/meals/recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET /api/meals/recipes', () => {
    const mockRecipes = [
      {
        id: 'recipe-1',
        familyId: 'family-test-123',
        name: 'Spaghetti Carbonara',
        description: 'Classic Italian pasta dish',
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 4,
        difficulty: 'MEDIUM',
        imageUrl: null,
        sourceUrl: null,
        instructions: JSON.stringify(['Boil pasta', 'Mix eggs and cheese', 'Combine']),
        notes: null,
        isFavorite: true,
        category: 'DINNER',
        dietaryTags: ['VEGETARIAN'],
        createdBy: 'parent-test-123',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
        creator: {
          id: 'parent-test-123',
          name: 'Test User',
        },
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'Pasta',
            quantity: 1,
            unit: 'lb',
            notes: null,
            sortOrder: 0,
          },
        ],
        _count: {
          ratings: 2,
        },
      },
    ];

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all recipes for family', async () => {
      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0].name).toBe('Spaghetti Carbonara');
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          ingredients: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              ratings: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter by category', async () => {
      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes?category=DINNER');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          category: 'DINNER',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should filter by isFavorite', async () => {
      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes?isFavorite=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          isFavorite: true,
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should search by name', async () => {
      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes?search=spaghetti');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          name: {
            contains: 'spaghetti',
            mode: 'insensitive',
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should combine multiple filters', async () => {
      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest(
        'http://localhost:3000/api/meals/recipes?category=DINNER&isFavorite=true&search=pasta'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          category: 'DINNER',
          isFavorite: true,
          name: {
            contains: 'pasta',
            mode: 'insensitive',
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should return empty array when no recipes exist', async () => {
      prismaMock.recipe.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipes).toEqual([]);
    });
  });

  describe('POST /api/meals/recipes', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Recipe' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name is required');
    });

    it('should create recipe with minimal data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockRecipe = {
        id: 'recipe-1',
        familyId: 'family-test-123',
        name: 'Simple Pasta',
        description: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        servings: 4,
        difficulty: 'MEDIUM',
        imageUrl: null,
        sourceUrl: null,
        instructions: JSON.stringify([]),
        notes: null,
        isFavorite: false,
        category: null,
        dietaryTags: [],
        createdBy: 'parent-test-123',
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.recipe.create.mockResolvedValue(mockRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Simple Pasta',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.recipe.name).toBe('Simple Pasta');
      expect(data.message).toBe('Recipe created successfully');

      expect(prismaMock.recipe.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Simple Pasta',
          description: null,
          prepTimeMinutes: null,
          cookTimeMinutes: null,
          servings: 4,
          difficulty: 'MEDIUM',
          imageUrl: null,
          sourceUrl: null,
          instructions: JSON.stringify([]),
          notes: null,
          isFavorite: false,
          category: null,
          dietaryTags: [],
          createdBy: 'parent-test-123',
          ingredients: {
            create: [],
          },
        },
        include: {
          ingredients: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'RECIPE_CREATED',
          result: 'SUCCESS',
          metadata: {
            recipeId: 'recipe-1',
            name: 'Simple Pasta',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should create recipe with full data and ingredients', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockRecipe = {
        id: 'recipe-1',
        familyId: 'family-test-123',
        name: 'Spaghetti Carbonara',
        description: 'Classic Italian pasta',
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 6,
        difficulty: 'HARD',
        imageUrl: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com/recipe',
        instructions: JSON.stringify(['Step 1', 'Step 2']),
        notes: 'Use fresh eggs',
        isFavorite: true,
        category: 'DINNER',
        dietaryTags: ['VEGETARIAN'],
        createdBy: 'parent-test-123',
        createdAt: now,
        updatedAt: now,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'Pasta',
            quantity: 1,
            unit: 'lb',
            notes: 'spaghetti',
            sortOrder: 0,
          },
        ],
      };

      prismaMock.recipe.create.mockResolvedValue(mockRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Spaghetti Carbonara',
          description: 'Classic Italian pasta',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          servings: 6,
          difficulty: 'HARD',
          imageUrl: 'https://example.com/image.jpg',
          sourceUrl: 'https://example.com/recipe',
          instructions: ['Step 1', 'Step 2'],
          notes: 'Use fresh eggs',
          isFavorite: true,
          category: 'DINNER',
          dietaryTags: ['VEGETARIAN'],
          ingredients: [
            {
              name: 'Pasta',
              quantity: 1,
              unit: 'lb',
              notes: 'spaghetti',
            },
          ],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.recipe.name).toBe('Spaghetti Carbonara');
      expect(data.recipe.ingredients).toHaveLength(1);

      expect(prismaMock.recipe.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Spaghetti Carbonara',
          description: 'Classic Italian pasta',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          servings: 6,
          difficulty: 'HARD',
          imageUrl: 'https://example.com/image.jpg',
          sourceUrl: 'https://example.com/recipe',
          instructions: JSON.stringify(['Step 1', 'Step 2']),
          notes: 'Use fresh eggs',
          isFavorite: true,
          category: 'DINNER',
          dietaryTags: ['VEGETARIAN'],
          createdBy: 'parent-test-123',
          ingredients: {
            create: [
              {
                name: 'Pasta',
                quantity: 1,
                unit: 'lb',
                notes: 'spaghetti',
                sortOrder: 0,
              },
            ],
          },
        },
        include: {
          ingredients: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      jest.useRealTimers();
    });

    it('should auto-assign sortOrder to ingredients', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        familyId: 'family-test-123',
        name: 'Test Recipe',
        ingredients: [],
      };

      prismaMock.recipe.create.mockResolvedValue(mockRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          ingredients: [
            { name: 'Ingredient 1', quantity: 1, unit: 'cup' },
            { name: 'Ingredient 2', quantity: 2, unit: 'tbsp' },
            { name: 'Ingredient 3', quantity: 3, unit: 'oz' },
          ],
        }),
      });
      await POST(request);

      expect(prismaMock.recipe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingredients: {
              create: [
                expect.objectContaining({ name: 'Ingredient 1', sortOrder: 0 }),
                expect.objectContaining({ name: 'Ingredient 2', sortOrder: 1 }),
                expect.objectContaining({ name: 'Ingredient 3', sortOrder: 2 }),
              ],
            },
          }),
        })
      );
    });

    it('should validate difficulty enum', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          difficulty: 'INVALID',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('difficulty');
    });

    it('should validate category enum', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          category: 'INVALID',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('category');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Recipe' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create recipe');
    });
  });
});
