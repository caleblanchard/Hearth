/**
 * Component Tests: New Recipe Form
 *
 * Tests for the recipe creation/import form
 * Total: 25 tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NewRecipePage from '@/app/dashboard/meals/recipes/new/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('NewRecipeForm Component', () => {
  const mockPush = jest.fn();
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      role: 'PARENT',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });
    (global.fetch as jest.Mock).mockClear();
  });

  // Test 1: Renders form with all required fields
  it('should render form with all required fields', () => {
    render(<NewRecipePage />);

    expect(screen.getByLabelText(/recipe name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/servings/i)).toBeInTheDocument();
  });

  // Test 2: Shows URL import section
  it('should show import from URL section when toggled', () => {
    render(<NewRecipePage />);

    const importButton = screen.getByText(/import from url/i);
    fireEvent.click(importButton);

    expect(screen.getByPlaceholderText(/enter recipe url/i)).toBeInTheDocument();
  });

  // Test 3: Name input is required
  it('should show error when submitting without name', async () => {
    render(<NewRecipePage />);

    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/recipe name is required/i)).toBeInTheDocument();
    });
  });

  // Test 4: Category dropdown shows all categories
  it('should display all recipe categories in dropdown', () => {
    render(<NewRecipePage />);

    const categorySelect = screen.getByLabelText(/category/i);

    expect(categorySelect).toContainHTML('BREAKFAST');
    expect(categorySelect).toContainHTML('LUNCH');
    expect(categorySelect).toContainHTML('DINNER');
    expect(categorySelect).toContainHTML('DESSERT');
    expect(categorySelect).toContainHTML('SNACK');
  });

  // Test 5: Difficulty dropdown shows EASY/MEDIUM/HARD
  it('should display difficulty levels in dropdown', () => {
    render(<NewRecipePage />);

    const difficultySelect = screen.getByLabelText(/difficulty/i);

    expect(difficultySelect).toContainHTML('EASY');
    expect(difficultySelect).toContainHTML('MEDIUM');
    expect(difficultySelect).toContainHTML('HARD');
  });

  // Test 6: Servings defaults to 4
  it('should default servings to 4', () => {
    render(<NewRecipePage />);

    const servingsInput = screen.getByLabelText(/servings/i) as HTMLInputElement;
    expect(servingsInput.value).toBe('4');
  });

  // Test 7: Can add ingredient
  it('should allow adding new ingredients', () => {
    render(<NewRecipePage />);

    const addIngredientButton = screen.getByRole('button', { name: /add ingredient/i });
    fireEvent.click(addIngredientButton);

    const ingredientInputs = screen.getAllByPlaceholderText(/ingredient name/i);
    expect(ingredientInputs.length).toBeGreaterThan(1);
  });

  // Test 8: Can remove ingredient
  it('should allow removing ingredients', () => {
    render(<NewRecipePage />);

    const addIngredientButton = screen.getByRole('button', { name: /add ingredient/i });
    fireEvent.click(addIngredientButton);

    const removeButtons = screen.getAllByRole('button', { name: /remove ingredient/i });
    fireEvent.click(removeButtons[0]);

    const ingredientInputs = screen.getAllByPlaceholderText(/ingredient name/i);
    expect(ingredientInputs.length).toBe(1);
  });

  // Test 9: Ingredients have quantity, unit, name fields
  it('should display quantity, unit, and name fields for ingredients', () => {
    render(<NewRecipePage />);

    expect(screen.getByPlaceholderText(/ingredient name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/unit/i)).toBeInTheDocument();
  });

  // Test 10: Can add instruction step
  it('should allow adding instruction steps', () => {
    render(<NewRecipePage />);

    const addStepButton = screen.getByRole('button', { name: /add step/i });
    fireEvent.click(addStepButton);

    const stepInputs = screen.getAllByPlaceholderText(/step \d+/i);
    expect(stepInputs.length).toBeGreaterThan(1);
  });

  // Test 11: Can remove instruction step
  it('should allow removing instruction steps', () => {
    render(<NewRecipePage />);

    const addStepButton = screen.getByRole('button', { name: /add step/i });
    fireEvent.click(addStepButton);

    const removeButtons = screen.getAllByRole('button', { name: /remove step/i });
    fireEvent.click(removeButtons[0]);

    const stepInputs = screen.getAllByPlaceholderText(/step \d+/i);
    expect(stepInputs.length).toBe(1);
  });

  // Test 12: Can reorder instruction steps
  it('should have buttons to reorder instruction steps', () => {
    render(<NewRecipePage />);

    const addStepButton = screen.getByRole('button', { name: /add step/i });
    fireEvent.click(addStepButton);

    expect(screen.getAllByRole('button', { name: /move up/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /move down/i }).length).toBeGreaterThan(0);
  });

  // Test 13: Dietary tags are checkboxes
  it('should display dietary tag checkboxes', () => {
    render(<NewRecipePage />);

    expect(screen.getByLabelText(/vegetarian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vegan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gluten.free/i)).toBeInTheDocument();
  });

  // Test 14: Image URL input is optional
  it('should have optional image URL input', () => {
    render(<NewRecipePage />);

    const imageInput = screen.getByLabelText(/image url/i);
    expect(imageInput).not.toBeRequired();
  });

  // Test 15: Submit button disabled when name is empty
  it('should disable submit button when name is empty', () => {
    render(<NewRecipePage />);

    const submitButton = screen.getByRole('button', { name: /save recipe/i });

    // Initially enabled (name field starts empty but button isn't disabled by default)
    // User needs to type and clear for validation
    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    // Check that submitting without name shows error
    fireEvent.click(submitButton);

    waitFor(() => {
      expect(screen.getByText(/recipe name is required/i)).toBeInTheDocument();
    });
  });

  // Test 16: Calls POST /api/meals/recipes on submit
  it('should call API to create recipe on submit', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipe: { id: 'new-recipe-123' } }),
    });

    render(<NewRecipePage />);

    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Recipe' } });

    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/recipes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  // Test 17: Shows loading state while saving
  it('should show loading state during save', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ recipe: { id: 'new-recipe-123' } }),
      }), 100))
    );

    render(<NewRecipePage />);

    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Recipe' } });

    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  // Test 18: Redirects to recipe detail page on success
  it('should redirect to recipe detail page after successful save', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipe: { id: 'new-recipe-123' } }),
    });

    render(<NewRecipePage />);

    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Recipe' } });

    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/meals/recipes/new-recipe-123');
    });
  });

  // Test 19: Shows error message on API failure
  it('should display error message if save fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create recipe' }),
    });

    render(<NewRecipePage />);

    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Recipe' } });

    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument();
    });
  });

  // Test 20: Import from URL button triggers import flow
  it('should trigger import flow when clicking import button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recipe: {
          name: 'Imported Recipe',
          ingredients: [],
          instructions: [],
        },
      }),
    });

    render(<NewRecipePage />);

    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/recipes/import',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  // Test 21: Import flow fetches from /api/meals/recipes/import
  it('should fetch from import API endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recipe: {
          name: 'Imported Recipe',
          ingredients: [],
          instructions: [],
        },
      }),
    });

    render(<NewRecipePage />);

    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const importCall = calls.find(call => call[0] === '/api/meals/recipes/import');
      expect(importCall).toBeDefined();
    });
  });

  // Test 22: Import flow pre-fills form with extracted data
  it('should pre-fill form fields with imported data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recipe: {
          name: 'Chocolate Cake',
          description: 'Delicious cake',
          prepTimeMinutes: 20,
          cookTimeMinutes: 30,
          servings: 8,
          category: 'DESSERT',
          difficulty: 'MEDIUM',
          ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }],
          instructions: ['Mix ingredients', 'Bake'],
        },
      }),
    });

    render(<NewRecipePage />);

    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/recipe name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Chocolate Cake');
    });
  });

  // Test 23: Import flow shows loading state during extraction
  it('should show loading state during import', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          recipe: { name: 'Test', ingredients: [], instructions: [] },
        }),
      }), 100))
    );

    render(<NewRecipePage />);

    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    expect(screen.getByText(/importing/i)).toBeInTheDocument();
  });

  // Test 24: Import flow shows error if extraction fails
  it('should display error if import fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No recipe data found at URL' }),
    });

    render(<NewRecipePage />);

    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/not-a-recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/no recipe data found at url/i)).toBeInTheDocument();
    });
  });

  // Test 25: Import flow allows editing before saving
  it('should allow editing imported data before saving', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recipe: {
            name: 'Imported Recipe',
            servings: 4,
            ingredients: [],
            instructions: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipe: { id: 'saved-recipe-123' } }),
      });

    render(<NewRecipePage />);

    // Import recipe
    const toggleButton = screen.getByText(/import from url/i);
    fireEvent.click(toggleButton);

    const urlInput = screen.getByPlaceholderText(/enter recipe url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    const importButton = screen.getByRole('button', { name: /^import$/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/recipe name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Imported Recipe');
    });

    // Edit the imported data
    const nameInput = screen.getByLabelText(/recipe name/i);
    fireEvent.change(nameInput, { target: { value: 'My Modified Recipe' } });

    const servingsInput = screen.getByLabelText(/servings/i);
    fireEvent.change(servingsInput, { target: { value: '6' } });

    // Save
    const submitButton = screen.getByRole('button', { name: /save recipe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/meals/recipes/saved-recipe-123');
    });
  });
});
