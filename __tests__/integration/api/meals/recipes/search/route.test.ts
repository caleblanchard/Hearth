/**
 * Integration tests for GET /api/meals/recipes/search
 * 
 * Tests autocomplete search with weighted scoring:
 * - Title match: 100 points
 * - Tag match: 50 points
 * - Ingredient match: 25 points
 * - Returns top 5 results by score
 */

// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/meals/recipes/search/route';
import { mockParentSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/meals/recipes/search', () => {
  const familyId = 'family-test-123';
  const userId = 'parent-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Query Parameter Validation', () => {
    it('should return 400 if query parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query is required');
    });

    it('should return 400 if query is too short (less than 2 characters)', async () => {
      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=a');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query must be at least 2 characters');
    });
  });

  describe('Search Functionality', () => {
    it('should search recipes by title with highest priority', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Spaghetti Carbonara',
          familyId,
          imageUrl: '/spaghetti.jpg',
          category: 'DINNER',
          dietaryTags: [],
          ingredients: [],
        },
        {
          id: 'recipe-2',
          name: 'Chicken Alfredo',
          familyId,
          imageUrl: null,
          category: 'DINNER',
          dietaryTags: [],
          ingredients: [],
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=spaghetti');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(2);
      expect(data.recipes[0].id).toBe('recipe-1'); // Title match should be first
      expect(data.recipes[0].score).toBeGreaterThan(data.recipes[1].score);
      
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            familyId,
            OR: expect.arrayContaining([
              { name: { contains: 'spaghetti', mode: 'insensitive' } },
            ]),
          },
          select: expect.objectContaining({
            ingredients: {
              select: { name: true },
            },
          }),
        })
      );
    });

    it('should search recipes by dietary tags', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Quinoa Salad',
          familyId,
          imageUrl: null,
          category: 'LUNCH',
          dietaryTags: ['VEGAN', 'GLUTEN_FREE'],
          ingredients: [],
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=vegan');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0].id).toBe('recipe-1');
      expect(data.recipes[0].score).toBeGreaterThan(0);
    });

    it('should search recipes by ingredient names', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Pasta Marinara',
          familyId,
          imageUrl: null,
          category: 'DINNER',
          dietaryTags: [],
          ingredients: [
            { name: 'tomatoes' },
            { name: 'basil' },
            { name: 'garlic' },
          ],
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=tomato');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0].id).toBe('recipe-1');
    });

    it('should return weighted scores (title > tags > ingredients)', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Chicken Salad', // Title match
          familyId,
          imageUrl: null,
          category: 'LUNCH',
          dietaryTags: [],
          ingredients: [{ name: 'lettuce' }],
        },
        {
          id: 'recipe-2',
          name: 'Greek Salad', // Title partial match
          familyId,
          imageUrl: null,
          category: 'LUNCH',
          dietaryTags: ['VEGAN'],
          ingredients: [{ name: 'chicken' }], // Ingredient match
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=chicken');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(2);
      // Recipe 1 should have higher score (title match = 100 points)
      // Recipe 2 should have lower score (ingredient match = 25 points)
      expect(data.recipes[0].id).toBe('recipe-1');
      expect(data.recipes[0].score).toBe(100);
      expect(data.recipes[1].score).toBe(25);
    });

    it('should limit results to 5 recipes', async () => {
      const mockRecipes = Array.from({ length: 10 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `Recipe ${i}`,
        familyId,
        imageUrl: null,
        category: 'DINNER',
        dietaryTags: [],
        ingredients: [],
      }));

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=recipe');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(5);
    });

    it('should return empty array if no matches found', async () => {
      prismaMock.recipe.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=nonexistent');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toEqual([]);
    });

    it('should be case-insensitive', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Spaghetti Carbonara',
          familyId,
          imageUrl: null,
          category: 'DINNER',
          dietaryTags: [],
          ingredients: [],
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=SPAGHETTI');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0].id).toBe('recipe-1');
    });

    it('should include recipe metadata in response', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Test Recipe',
          familyId,
          imageUrl: '/test.jpg',
          category: 'DINNER',
          dietaryTags: ['VEGAN'],
          ingredients: [{ name: 'ingredient1' }],
        },
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.recipes[0]).toEqual({
        id: 'recipe-1',
        name: 'Test Recipe',
        imageUrl: '/test.jpg',
        category: 'DINNER',
        dietaryTags: ['VEGAN'],
        score: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to search recipes');
    });
  });
});
