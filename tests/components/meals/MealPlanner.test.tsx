import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlanner from '@/app/dashboard/meals/MealPlanner';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('MealPlanner Component', () => {
  beforeEach(() => {
    // Mock Date to return fixed time
    const fixedDate = new Date('2026-01-07T12:00:00Z');
    const OriginalDate = Date;
    
    // We need to keep the original prototype for instanceof checks
    // and to avoid infinite recursion
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length) {
        return new OriginalDate(...args as [any]);
      }
      return fixedDate;
    });
    
    // Copy static methods
    Object.setPrototypeOf(global.Date, OriginalDate);

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Default mock implementation handling both endpoints
    (global.fetch as jest.Mock).mockImplementation(async (url) => {
      if (url.includes('family-data')) {
        return { 
          ok: true, 
          json: async () => ({
            weekStartDay: 'MONDAY',
            timezone: 'America/New_York'
          }) 
        };
      }
      return {
        ok: true,
        json: async () => mockEmptyMealPlan,
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockEmptyMealPlan = {
    mealPlan: null,
    weekStart: '2026-01-05',
  };

  const mockMealPlanWithEntries = {
    mealPlan: {
      id: 'plan-1',
      weekStart: new Date('2026-01-05'),
      meals: [
        {
          id: 'entry-1',
          date: new Date('2026-01-06'),
          mealType: 'BREAKFAST',
          customName: 'Pancakes',
          notes: 'With maple syrup',
        },
        {
          id: 'entry-2',
          date: new Date('2026-01-06'),
          mealType: 'DINNER',
          customName: 'Spaghetti',
          notes: null,
        },
      ],
    },
    weekStart: '2026-01-05',
  };

  it('should render week navigation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyMealPlan,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next week/i })).toBeInTheDocument();
    });
  });

  it('should load and display meal plan for current week on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMealPlanWithEntries,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/meals/plan?week='),
        expect.any(Object)
      );
    });
  });

  it('should display empty state when no meals planned', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyMealPlan,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/no meals planned/i)).toBeInTheDocument();
    });
  });

  it('should display meal entries in calendar grid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMealPlanWithEntries,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
      expect(screen.getByText('Spaghetti')).toBeInTheDocument();
    });
  });

  it('should show meal type labels', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMealPlanWithEntries,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/breakfast/i)).toBeInTheDocument();
      expect(screen.getByText(/dinner/i)).toBeInTheDocument();
    });
  });

  it('should navigate to previous week', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url) => {
      if (url.includes('family-data')) return { ok: true, json: async () => ({}) };
      
      if (url.includes('week=2025-12-29')) {
        return {
          ok: true,
          json: async () => ({
            mealPlan: null,
            weekStart: '2025-12-29',
          }),
        };
      }
      
      return {
        ok: true,
        json: async () => mockEmptyMealPlan,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockClear();

    const prevButton = screen.getByRole('button', { name: /previous week/i });
    await user.click(prevButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should navigate to next week', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url) => {
      if (url.includes('family-data')) return { ok: true, json: async () => ({}) };
      
      if (url.includes('week=2026-01-12')) {
        return {
          ok: true,
          json: async () => ({
            mealPlan: null,
            weekStart: '2026-01-12',
          }),
        };
      }
      
      return {
        ok: true,
        json: async () => mockEmptyMealPlan,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockClear();

    const nextButton = screen.getByRole('button', { name: /next week/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should open add meal dialog when clicking add button', async () => {
    const user = userEvent.setup();

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /add meal/i });
    await user.click(addButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/meal name/i)).toBeInTheDocument();
  });

  it('should create new meal entry', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (url.includes('family-data')) {
        return { ok: true, json: async () => ({}) };
      }
      if (options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            entry: {
              id: 'entry-1',
              customName: 'Tacos',
              mealType: 'DINNER',
              date: new Date('2026-01-06'),
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => mockEmptyMealPlan,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /add meal/i });
    await user.click(addButtons[0]);

    const nameInput = await screen.findByLabelText(/meal name/i);
    await user.type(nameInput, 'Tacos');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/plan',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Tacos'),
        })
      );
    });
  });

  it('should show meal notes when hovering over entry', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url) => {
      if (url.includes('family-data')) return { ok: true, json: async () => ({}) };
      return {
        ok: true,
        json: async () => mockMealPlanWithEntries,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });

    const pancakesEntry = screen.getByText('Pancakes');
    await user.hover(pancakesEntry);

    await waitFor(() => {
      expect(screen.getByText('With maple syrup')).toBeInTheDocument();
    });
  });

  it('should edit meal entry', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (url.includes('family-data')) {
        return { ok: true, json: async () => ({}) };
      }
      if (options?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            entry: {
              id: 'entry-1',
              customName: 'Waffles',
              notes: 'With strawberries',
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => mockMealPlanWithEntries,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });

    const pancakesEntry = screen.getByText('Pancakes');
    await user.click(pancakesEntry);

    const nameInput = await screen.findByDisplayValue('Pancakes');
    await user.clear(nameInput);
    await user.type(nameInput, 'Waffles');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/plan/entry-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('should delete meal entry', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (url.includes('family-data')) {
        return { ok: true, json: async () => ({}) };
      }
      if (options?.method === 'DELETE') {
        return { ok: true, json: async () => ({ message: 'Deleted' }) };
      }
      return {
        ok: true,
        json: async () => mockMealPlanWithEntries,
      };
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });

    const pancakesEntry = screen.getByText('Pancakes');
    await user.click(pancakesEntry);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/plan/entry-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('should display day headers (Mon, Tue, Wed, etc)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyMealPlan,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });
  });

  it('should display meal type rows (Breakfast, Lunch, Dinner, Snack)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyMealPlan,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Snack')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<MealPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load meal plan/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockEmptyMealPlan,
            });
          }, 100);
        })
    );

    render(<MealPlanner />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
