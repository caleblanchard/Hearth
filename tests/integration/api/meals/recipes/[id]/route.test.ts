// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/meals/recipes/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/meals/recipes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
    
    // Mock family member check for permissions
    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'parent-test-123',
      role: 'PARENT',
    } as any);
  });

  const mockRecipe = {
    id: 'recipe-1',
    familyId: 'family-test-123',
    family_id: 'family-test-123',
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta',
    prepTimeMinutes: 10,
    prep_time_minutes: 10,
    cookTimeMinutes: 20,
    cook_time_minutes: 20,
    servings: 4,
    difficulty: 'MEDIUM',
    imageUrl: null,
    image_url: null,
    sourceUrl: null,
    source_url: null,
    instructions: JSON.stringify(['Boil pasta', 'Mix eggs']),
    notes: null,
    isFavorite: true,
    is_favorite: true,
    category: 'DINNER',
    dietaryTags: ['VEGETARIAN'],
    dietary_tags: ['VEGETARIAN'],
    createdBy: 'parent-test-123',
    created_by: 'parent-test-123',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    created_at: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    updated_at: new Date('2026-01-01T12:00:00Z'),
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
    recipeIngredients: [
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
    recipe_ingredients: [
      {
        id: 'ing-1',
        recipe_id: 'recipe-1',
        name: 'Pasta',
        quantity: 1,
        unit: 'lb',
        notes: null,
        sort_order: 0,
      },
    ],
    ratings: [],
    ratingsCount: 0,
    averageRating: 0,
  };

  describe('GET /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return recipe by id', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.name).toBe('Spaghetti Carbonara');
      expect(data.recipe.ingredients).toHaveLength(1);

      expect(dbMock.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        include: expect.objectContaining({
          creator: expect.any(Object),
          recipeIngredients: expect.any(Object),
          ratings: expect.any(Object),
        }),
      });
    });

    it('should return 404 if recipe not found', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Recipe not found');
    });

    it('should return 403 if recipe belongs to different family', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
        family_id: 'other-family',
      };
      dbMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);
      dbMock.recipe.findFirst.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('PATCH /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 if recipe belongs to different family (SECURITY)', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
        family_id: 'other-family',
      };
      dbMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);
      dbMock.recipe.findFirst.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      // Code returns 404 for security (to hide existence)
      expect(response.status).toBe(404);
    });

    it('should update recipe basic fields', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRecipe = {
        ...mockRecipe,
        name: 'Updated Carbonara',
        description: 'Updated description',
        isFavorite: false,
      };
      dbMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Carbonara',
          description: 'Updated description',
          isFavorite: false,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.name).toBe('Updated Carbonara');
      expect(data.message).toBe('Recipe updated successfully');

      expect(dbMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          name: 'Updated Carbonara',
          description: 'Updated description',
          isFavorite: false,
        },
        include: expect.objectContaining({
          recipeIngredients: expect.any(Object),
          creator: expect.any(Object),
        }),
      });

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'RECIPE_UPDATED',
          result: 'SUCCESS',
          entityType: 'RECIPE',
          entityId: 'recipe-1',
          metadata: {
            recipeId: 'recipe-1',
            name: 'Updated Carbonara',
          },
        },
      });
    });

    it('should update recipe with new ingredients', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRecipe = {
        ...mockRecipe,
        recipe_ingredients: [
          {
            id: 'ing-new-1',
            recipe_id: 'recipe-1',
            name: 'New Ingredient',
            quantity: 2,
            unit: 'cups',
            notes: null,
            sort_order: 0,
          },
        ],
      };

      dbMock.recipeIngredient.deleteMany.mockResolvedValue({ count: 1 } as any);
      dbMock.recipeIngredient.create.mockResolvedValue({
        id: 'ing-new-1',
        recipe_id: 'recipe-1',
        name: 'New Ingredient',
        quantity: 2,
        unit: 'cups',
        notes: null,
        sort_order: 0,
      } as any);
      dbMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

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
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.ingredients).toHaveLength(1);

      // Verify old ingredients were deleted
      expect(dbMock.recipeIngredient.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
      });

      // Verify new ingredient was created
      expect(dbMock.recipeIngredient.create).toHaveBeenCalledWith({
        data: {
          recipeId: 'recipe-1',
          name: 'New Ingredient',
          quantity: 2,
          unit: 'cups',
          notes: null,
          sortOrder: 0,
        },
      });

      // Verify recipe was updated
      expect(dbMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {},
        include: expect.any(Object),
      });
    });

    it('should update instructions array', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const updatedRecipe = {
        ...mockRecipe,
        instructions: JSON.stringify(['New Step 1', 'New Step 2', 'New Step 3']),
      };
      dbMock.recipe.update.mockResolvedValue(updatedRecipe as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          instructions: ['New Step 1', 'New Step 2', 'New Step 3'],
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);

      expect(dbMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          instructions: JSON.stringify(['New Step 1', 'New Step 2', 'New Step 3']),
        },
        include: expect.any(Object),
      });
    });

    it('should validate difficulty enum on update', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          difficulty: 'INVALID',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('difficulty');
    });

    it('should handle database errors gracefully', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      dbMock.recipe.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Recipe' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update recipe');
    });
  });

  describe('DELETE /api/meals/recipes/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if recipe not found', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 if recipe belongs to different family (SECURITY)', async () => {
      const otherFamilyRecipe = {
        ...mockRecipe,
        familyId: 'other-family',
        family_id: 'other-family',
      };
      dbMock.recipe.findUnique.mockResolvedValue(otherFamilyRecipe as any);
      dbMock.recipe.findFirst.mockResolvedValue(otherFamilyRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(404);
    });

    it('should delete recipe successfully', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      dbMock.recipe.delete.mockResolvedValue(mockRecipe as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Recipe deleted successfully');

      expect(dbMock.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'RECIPE_DELETED',
          result: 'SUCCESS',
          entityType: 'RECIPE',
          entityId: 'recipe-1',
          metadata: {
            recipeId: 'recipe-1',
            name: 'Spaghetti Carbonara',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      dbMock.recipe.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete recipe');
    });
  });

  describe('Ingredient and Instruction Sections', () => {
    it('GET should return ingredientSections and instructionSections in response', async () => {
      const recipeWithSections = {
        ...mockRecipe,
        ingredientSections: [
          {
            id: 'sec-1',
            name: 'Ground Turkey Mixture',
            sort_order: 0,
            recipe_ingredients: [
              { id: 'ing-2', name: 'ground turkey', quantity: 1, unit: 'lb', notes: null, sort_order: 0 },
            ],
          },
        ],
        ungroupedIngredients: [],
        instructionSections: [
          {
            id: 'isec-1',
            name: 'Prep Bang Bang Sauce',
            sort_order: 0,
            recipe_instruction_steps: [
              { id: 'step-1', text: 'Combine mayo and sriracha', sort_order: 0 },
            ],
          },
        ],
        ungroupedSteps: [],
      };
      dbMock.recipe.findUnique.mockResolvedValue(recipeWithSections as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.ingredientSections).toHaveLength(1);
      expect(data.recipe.ingredientSections[0].name).toBe('Ground Turkey Mixture');
      expect(data.recipe.ingredientSections[0].ingredients).toHaveLength(1);
      expect(data.recipe.instructionSections).toHaveLength(1);
      expect(data.recipe.instructionSections[0].name).toBe('Prep Bang Bang Sauce');
      expect(data.recipe.instructionSections[0].steps).toHaveLength(1);
    });

    it('GET should return ungroupedIngredients and ungroupedSteps for flat recipes', async () => {
      const flatRecipe = {
        ...mockRecipe,
        ingredient_sections: [],
        recipe_ingredients: [
          { id: 'ing-1', recipe_id: 'recipe-1', name: 'Pasta', quantity: 1, unit: 'lb', notes: null, sort_order: 0, section_id: null },
        ],
        instruction_sections: [],
        recipe_instruction_steps: [
          { id: 'step-1', recipe_id: 'recipe-1', text: 'Boil pasta', sort_order: 0, section_id: null },
          { id: 'step-2', recipe_id: 'recipe-1', text: 'Mix eggs', sort_order: 1, section_id: null },
        ],
        ingredientSections: [],
        ungroupedIngredients: [
          { id: 'ing-1', name: 'Pasta', quantity: 1, unit: 'lb', notes: null, sort_order: 0, section_id: null },
        ],
        instructionSections: [],
        ungroupedSteps: [
          { id: 'step-1', text: 'Boil pasta', sort_order: 0, section_id: null },
          { id: 'step-2', text: 'Mix eggs', sort_order: 1, section_id: null },
        ],
      };
      dbMock.recipe.findUnique.mockResolvedValue(flatRecipe as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recipe.ingredientSections).toHaveLength(0);
      expect(data.recipe.ungroupedIngredients).toHaveLength(1);
      expect(data.recipe.instructionSections).toHaveLength(0);
      expect(data.recipe.ungroupedSteps).toHaveLength(2);
      expect(data.recipe.ungroupedSteps[0].text).toBe('Boil pasta');
    });

    it('PATCH should replace ingredient sections', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      dbMock.ingredientSection.deleteMany.mockResolvedValue({ count: 1 } as any);
      dbMock.recipeIngredient.deleteMany.mockResolvedValue({ count: 1 } as any);
      dbMock.ingredientSection.create.mockResolvedValue({ id: 'sec-new' } as any);
      dbMock.recipeIngredient.createMany.mockResolvedValue({ count: 2 } as any);
      dbMock.recipe.update.mockResolvedValue({
        ...mockRecipe,
        recipe_ingredients: [],
        ingredient_sections: [
          { id: 'sec-new', name: 'Bang Bang Sauce', sort_order: 0, recipe_ingredients: [] },
        ],
        recipe_instruction_steps: [],
        instruction_sections: [],
      } as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          ingredientSections: [
            {
              name: 'Bang Bang Sauce',
              ingredients: [
                { name: 'mayonnaise', quantity: 0.5, unit: 'cup' },
                { name: 'sriracha', quantity: 1, unit: 'tbsp' },
              ],
            },
          ],
          ungroupedIngredients: [],
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      expect(dbMock.ingredientSection.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ recipeId: 'recipe-1' }) })
      );
      expect(dbMock.ingredientSection.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Bang Bang Sauce' }) })
      );
    });

    it('PATCH should replace instruction sections', async () => {
      dbMock.recipe.findUnique.mockResolvedValue(mockRecipe as any);
      dbMock.instructionSection.deleteMany.mockResolvedValue({ count: 0 } as any);
      dbMock.recipeInstructionStep.deleteMany.mockResolvedValue({ count: 0 } as any);
      dbMock.instructionSection.create.mockResolvedValue({ id: 'isec-new' } as any);
      dbMock.recipeInstructionStep.createMany.mockResolvedValue({ count: 2 } as any);
      dbMock.recipe.update.mockResolvedValue({
        ...mockRecipe,
        recipe_ingredients: [],
        ingredient_sections: [],
        recipe_instruction_steps: [],
        instruction_sections: [
          {
            id: 'isec-new',
            name: 'Cook Turkey',
            sort_order: 0,
            recipe_instruction_steps: [{ id: 'step-1', text: 'Brown turkey', sort_order: 0 }],
          },
        ],
      } as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/meals/recipes/recipe-1', {
        method: 'PATCH',
        body: JSON.stringify({
          instructionSections: [
            {
              name: 'Cook Turkey',
              steps: ['Brown turkey in skillet', 'Add seasonings'],
            },
          ],
          ungroupedSteps: [],
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'recipe-1' }) });

      expect(response.status).toBe(200);
      expect(dbMock.instructionSection.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ recipeId: 'recipe-1' }) })
      );
      expect(dbMock.instructionSection.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Cook Turkey' }) })
      );
    });
  });
});
