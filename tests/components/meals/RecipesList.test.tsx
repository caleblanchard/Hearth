import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipesList from '@/app/dashboard/meals/RecipesList';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('RecipesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: [] }),
    });
  });

  it('adds search query to recipe fetch', async () => {
    const user = userEvent.setup();

    render(<RecipesList />);

    const searchInput = await screen.findByRole('searchbox', {
      name: /search recipes/i,
    });

    await user.type(searchInput, 'pasta');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('search=pasta'),
        expect.any(Object)
      );
    });
  });

  it('renders recipe with image', async () => {
    const mockRecipe = {
      id: '1',
      name: 'Test Pasta',
      description: 'Delicious pasta',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 4,
      difficulty: 'EASY',
      category: 'DINNER',
      dietaryTags: [],
      isFavorite: false,
      imageUrl: 'http://example.com/pasta.jpg',
      creator: { id: '1', name: 'Chef' },
      ingredients: [],
      _count: { ratings: 0 },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: [mockRecipe] }),
    });

    render(<RecipesList />);

    const image = await screen.findByRole('img', { name: /test pasta/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'http://example.com/pasta.jpg');
  });
});
