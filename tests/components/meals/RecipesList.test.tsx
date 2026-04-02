import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipesList from '@/app/dashboard/meals/RecipesList';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

global.fetch = jest.fn();

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

function mockFetchResponses({ role = 'CHILD', recipes = [] as any[] } = {}) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/user/role')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ role }),
      });
    }
    if (url.includes('/api/meals/recipes') && !url.includes('/api/meals/recipes/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ recipes }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe('RecipesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchResponses();
  });

  it('adds search query to recipe fetch', async () => {
    const user = userEvent.setup();

    render(<RecipesList />);

    const searchInput = await screen.findByRole('searchbox', {
      name: /search recipes/i,
    });

    await user.type(searchInput, 'pasta');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=pasta'),
        expect.any(Object)
      );
    });
  });

  it('renders recipe with image', async () => {
    mockFetchResponses({ recipes: [mockRecipe] });

    render(<RecipesList />);

    const image = await screen.findByRole('img', { name: /test pasta/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'http://example.com/pasta.jpg');
  });

  it('does not show edit/delete buttons for non-parent users', async () => {
    mockFetchResponses({ role: 'CHILD', recipes: [mockRecipe] });

    render(<RecipesList />);

    await screen.findByText('Test Pasta');

    expect(screen.queryByLabelText(/edit test pasta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete test pasta/i)).not.toBeInTheDocument();
  });

  it('shows edit/delete buttons for parent users', async () => {
    mockFetchResponses({ role: 'PARENT', recipes: [mockRecipe] });

    render(<RecipesList />);

    expect(await screen.findByLabelText(/edit test pasta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delete test pasta/i)).toBeInTheDocument();
  });

  it('navigates to edit page when edit button is clicked', async () => {
    const user = userEvent.setup();
    mockFetchResponses({ role: 'PARENT', recipes: [mockRecipe] });

    render(<RecipesList />);

    const editBtn = await screen.findByLabelText(/edit test pasta/i);
    await user.click(editBtn);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/meals/recipes/1/edit');
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockFetchResponses({ role: 'PARENT', recipes: [mockRecipe] });

    render(<RecipesList />);

    const deleteBtn = await screen.findByLabelText(/delete test pasta/i);
    await user.click(deleteBtn);

    expect(await screen.findByText(/are you sure you want to delete "Test Pasta"/i)).toBeInTheDocument();
  });

  it('calls DELETE API and refreshes list when delete is confirmed', async () => {
    const user = userEvent.setup();
    mockFetchResponses({ role: 'PARENT', recipes: [mockRecipe] });

    render(<RecipesList />);

    const deleteBtn = await screen.findByLabelText(/delete test pasta/i);
    await user.click(deleteBtn);

    // Mock DELETE to succeed, then return empty recipes on refresh
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url.includes('/api/user/role')) {
        return Promise.resolve({ ok: true, json: async () => ({ role: 'PARENT' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ recipes: [] }) });
    });

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/recipes/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
