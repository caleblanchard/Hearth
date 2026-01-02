// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/meals/recipes/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/meals/recipes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  const mockRecipe = {
    id: 'recipe-1',
    familyId: 'family-test-123',
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: 'MEDIUM',
    imageUrl: null,
    sourceUrl: null,
    instructions: JSON.stringify(['Boil pasta', 'Mix eggs']),
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
    ratings: [],
  };

  describe('GET /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(401);
    });

    it('should return recipe by id', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.name).toBe('Spaghetti Carbonara');
      expect(data.recipe.ingredients).toHaveLength(1);

      expect(prismaMock.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
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
          ratings: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return 404 if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Recipe not found');
    });

    it('should return 403 if recipe belongs to different family', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
      };
      prismaMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('PATCH /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if recipe belongs to different family', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
      };
      prismaMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(403);
    });

    it('should update recipe basic fields', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRecipe = {
        ...mockRecipe,
        name: 'Updated Carbonara',
        description: 'Updated description',
        isFavorite: false,
      };
      prismaMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Carbonara',
          description: 'Updated description',
          isFavorite: false,
        }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.name).toBe('Updated Carbonara');
      expect(data.message).toBe('Recipe updated successfully');

      expect(prismaMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          name: 'Updated Carbonara',
          description: 'Updated description',
          isFavorite: false,
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
          action: 'RECIPE_UPDATED',
          result: 'SUCCESS',
          metadata: {
            recipeId: 'recipe-1',
            name: 'Updated Carbonara',
          },
        },
      });
    });

    it('should update recipe with new ingredients', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      const updatedRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-new-1',
            recipeId: 'recipe-1',
            name: 'New Ingredient',
            quantity: 2,
            unit: 'cups',
            notes: null,
            sortOrder: 0,
          },
        ],
      };

      prismaMock.recipeIngredient.deleteMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          ingredients: [
            {
              name: 'New Ingredient',
              quantity: 2,
              unit: 'cups',
            },
          ],
        }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.ingredients).toHaveLength(1);

      // Verify old ingredients were deleted
      expect(prismaMock.recipeIngredient.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
      });

      // Verify new ingredients were added with sortOrder
      expect(prismaMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          ingredients: {
            create: [
              {
                name: 'New Ingredient',
                quantity: 2,
                unit: 'cups',
                notes: null,
                sortOrder: 0,
              },
            ],
          },
        },
        include: expect.any(Object),
      });
    });

    it('should update instructions array', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRecipe = {
        ...mockRecipe,
        instructions: JSON.stringify(['New Step 1', 'New Step 2', 'New Step 3']),
      };
      prismaMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          instructions: ['New Step 1', 'New Step 2', 'New Step 3'],
        }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);

      expect(prismaMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          instructions: JSON.stringify(['New Step 1', 'New Step 2', 'New Step 3']),
        },
        include: expect.any(Object),
      });
    });

    it('should validate difficulty enum on update', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          difficulty: 'INVALID',
        }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('difficulty');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipe.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update recipe');
    });
  });

  describe('DELETE /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if recipe belongs to different family', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
      };
      prismaMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(403);
    });

    it('should delete recipe successfully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipe.delete.mockResolvedValue(mockRecipe as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Recipe deleted successfully');

      expect(prismaMock.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'RECIPE_DELETED',
          result: 'SUCCESS',
          metadata: {
            recipeId: 'recipe-1',
            name: 'Spaghetti Carbonara',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipe.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete recipe');
    });
  });
});
