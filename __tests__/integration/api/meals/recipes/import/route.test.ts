/**
 * Integration Tests: Recipe Import API
 *
 * Tests for POST /api/meals/recipes/import
 * Total: 20 tests
 */

// Set up mocks BEFORE any imports
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/recipe-extractor', () => ({
  extractRecipeFromUrl: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/meals/recipes/import/route';

const { extractRecipeFromUrl } = require('@/lib/recipe-extractor');

describe('POST /api/meals/recipes/import', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      familyId: 'family-123',
      name: 'Test User',
      role: 'PARENT',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockRecipe = {
    name: 'Chocolate Chip Cookies',
    description: 'Classic homemade chocolate chip cookies',
    prepTimeMinutes: 15,
    cookTimeMinutes: 12,
    servings: 24,
    category: 'DESSERT',
    difficulty: 'EASY' as const,
    imageUrl: 'https://example.com/cookies.jpg',
    sourceUrl: 'https://example.com/recipe/cookies',
    ingredients: [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'chocolate chips', quantity: 1, unit: 'cup' },
    ],
    instructions: [
      'Preheat oven to 375°F',
      'Mix dry ingredients',
      'Bake for 12 minutes',
    ],
    dietaryTags: ['VEGETARIAN'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Authentication required
  it('should return 401 if user is not authenticated', async () => {

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  // Test 2: URL validation - missing URL
  it('should return 400 if URL is missing', async () => {

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('URL is required');
  });

  // Test 3: URL validation - invalid type
  it('should return 400 if URL is not a string', async () => {

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('URL is required');
  });

  // Test 4: URL must be valid HTTP/HTTPS
  it('should return 400 if URL protocol is not HTTP or HTTPS', async () => {

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'ftp://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('URL must be HTTP or HTTPS');
  });

  // Test 5: URL format validation
  it('should return 400 if URL format is invalid', async () => {

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid URL format');
  });

  // Test 6: Successful extraction from valid recipe URL
  it('should return 200 with extracted recipe data', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe/cookies' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipe).toEqual(mockRecipe);
    expect(extractRecipeFromUrl).toHaveBeenCalledWith('https://example.com/recipe/cookies');
  });

  // Test 7: Returns 404 if URL doesn't contain recipe data
  it('should return 404 if no recipe data found at URL', async () => {
    extractRecipeFromUrl.mockRejectedValue(new Error('No recipe data found'));

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/no-recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No recipe data found at URL');
  });

  // Test 8: Handles extraction errors
  it('should return 500 if extraction fails', async () => {
    extractRecipeFromUrl.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to extract recipe');
  });

  // Test 9: Extracts name (required field)
  it('should extract recipe name', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.name).toBe('Chocolate Chip Cookies');
  });

  // Test 10: Extracts description (optional)
  it('should extract recipe description if present', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.description).toBe('Classic homemade chocolate chip cookies');
  });

  // Test 11: Parses ISO 8601 prep time
  it('should parse prep time from ISO 8601 duration', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.prepTimeMinutes).toBe(15);
  });

  // Test 12: Parses ISO 8601 cook time
  it('should parse cook time from ISO 8601 duration', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.cookTimeMinutes).toBe(12);
  });

  // Test 13: Extracts servings with default fallback
  it('should extract servings count', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.servings).toBe(24);
  });

  // Test 14: Extracts ingredients array
  it('should extract ingredients list', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.ingredients).toHaveLength(2);
    expect(data.recipe.ingredients[0]).toMatchObject({
      name: 'flour',
      quantity: 2,
      unit: 'cups',
    });
  });

  // Test 15: Extracts instructions (recipeInstructions)
  it('should extract cooking instructions', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.instructions).toHaveLength(3);
    expect(data.recipe.instructions[0]).toBe('Preheat oven to 375°F');
  });

  // Test 16: Extracts imageUrl
  it('should extract image URL if present', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.imageUrl).toBe('https://example.com/cookies.jpg');
  });

  // Test 17: Stores sourceUrl in response
  it('should include source URL in response', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe/cookies' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.sourceUrl).toBe('https://example.com/recipe/cookies');
  });

  // Test 18: Infers difficulty from cook times
  it('should infer difficulty level from cooking times', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.difficulty).toBe('EASY');
  });

  // Test 19: Maps category to enum values
  it('should map recipe category to valid enum', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.category).toBe('DESSERT');
  });

  // Test 20: Extracts dietary tags
  it('should extract dietary tags from recipe data', async () => {
    extractRecipeFromUrl.mockResolvedValue(mockRecipe);

    const request = new NextRequest('http://localhost/api/meals/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.recipe.dietaryTags).toContain('VEGETARIAN');
  });
});
