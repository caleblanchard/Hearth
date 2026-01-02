// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/meals/recipes/[id]/rate/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/meals/recipes/[id]/rate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  const mockRecipe = {
    id: 'recipe-1',
    familyId: 'family-test-123',
    name: 'Test Recipe',
  };

  const mockRating = {
    id: 'rating-1',
    recipeId: 'recipe-1',
    memberId: 'parent-test-123',
    rating: 5,
    notes: 'Delicious!',
    createdAt: new Date('2026-01-01T12:00:00Z'),
  };

  describe('POST /api/meals/recipes/[id]/rate', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

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

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 if rating is missing', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Rating is required');
    });

    it('should return 400 if rating is not between 1-5', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 6 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Rating must be between 1 and 5');
    });

    it('should create new rating', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipeRating.upsert.mockResolvedValue(mockRating as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({
          rating: 5,
          notes: 'Delicious!',
        }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rating.rating).toBe(5);
      expect(data.rating.notes).toBe('Delicious!');
      expect(data.message).toBe('Rating saved successfully');

      expect(prismaMock.recipeRating.upsert).toHaveBeenCalledWith({
        where: {
          recipeId_memberId: {
            recipeId: 'recipe-1',
            memberId: 'parent-test-123',
          },
        },
        update: {
          rating: 5,
          notes: 'Delicious!',
        },
        create: {
          recipeId: 'recipe-1',
          memberId: 'parent-test-123',
          rating: 5,
          notes: 'Delicious!',
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'RECIPE_RATED',
          result: 'SUCCESS',
          metadata: {
            recipeId: 'recipe-1',
            rating: 5,
          },
        },
      });
    });

    it('should update existing rating', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRating = {
        ...mockRating,
        rating: 3,
        notes: 'Pretty good',
      };
      prismaMock.recipeRating.upsert.mockResolvedValue(updatedRating as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({
          rating: 3,
          notes: 'Pretty good',
        }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rating.rating).toBe(3);
      expect(data.rating.notes).toBe('Pretty good');
    });

    it('should create rating without notes', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const ratingWithoutNotes = {
        ...mockRating,
        notes: null,
      };
      prismaMock.recipeRating.upsert.mockResolvedValue(ratingWithoutNotes as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({
          rating: 4,
        }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);

      expect(prismaMock.recipeRating.upsert).toHaveBeenCalledWith({
        where: {
          recipeId_memberId: {
            recipeId: 'recipe-1',
            memberId: 'parent-test-123',
          },
        },
        update: {
          rating: 4,
          notes: null,
        },
        create: {
          recipeId: 'recipe-1',
          memberId: 'parent-test-123',
          rating: 4,
          notes: null,
        },
      });
    });

    it('should allow children to rate recipes', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const childRating = {
        ...mockRating,
        memberId: 'child-test-123',
      };
      prismaMock.recipeRating.upsert.mockResolvedValue(childRating as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.recipeRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recipeId_memberId: {
              recipeId: 'recipe-1',
              memberId: 'child-test-123',
            },
          },
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipeRating.upsert.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      });
      const response = await POST(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to save rating');
    });
  });

  describe('DELETE /api/meals/recipes/[id]/rate', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if recipe belongs to different family', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
      };
      prismaMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(403);
    });

    it('should delete rating successfully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipeRating.delete.mockResolvedValue(mockRating as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Rating removed successfully');

      expect(prismaMock.recipeRating.delete).toHaveBeenCalledWith({
        where: {
          recipeId_memberId: {
            recipeId: 'recipe-1',
            memberId: 'parent-test-123',
          },
        },
      });
    });

    it('should return 404 if rating does not exist', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipeRating.delete.mockRejectedValue({ code: 'P2025' });

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Rating not found');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      prismaMock.recipeRating.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1/rate', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'recipe-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to remove rating');
    });
  });
});
