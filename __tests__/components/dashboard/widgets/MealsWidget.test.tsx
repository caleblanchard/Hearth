import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealsWidget from '@/components/dashboard/widgets/MealsWidget';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('MealsWidget', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<MealsWidget />);
    expect(screen.getByText(/loading meals/i)).toBeInTheDocument();
  });

  it('should render "no meals planned" when there are no meals for today', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: null,
        weekStart: '2024-01-08',
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no meals planned/i)).toBeInTheDocument();
    });
  });

  it('should render today\'s meals correctly', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: 'plan-1',
          weekStart: today.toISOString(),
          meals: [
            {
              id: 'meal-1',
              date: today.toISOString(),
              mealType: 'BREAKFAST',
              dishes: [
                { id: 'dish-1', dishName: 'Pancakes', recipeId: 'recipe-1', sortOrder: 0 },
              ],
            },
            {
              id: 'meal-2',
              date: today.toISOString(),
              mealType: 'DINNER',
              dishes: [
                { id: 'dish-2', dishName: 'Spaghetti', recipeId: 'recipe-2', sortOrder: 0 },
                { id: 'dish-3', dishName: 'Salad', recipeId: null, sortOrder: 1 },
              ],
            },
            {
              id: 'meal-3',
              date: new Date(today.getTime() + 86400000).toISOString(), // Tomorrow
              mealType: 'BREAKFAST',
              dishes: [
                { id: 'dish-4', dishName: 'Cereal', recipeId: null, sortOrder: 0 },
              ],
            },
          ],
        },
        weekStart: today.toISOString().split('T')[0],
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Spaghetti, Salad')).toBeInTheDocument();
    });

    // Should not show tomorrow's meal
    expect(screen.queryByText('Cereal')).not.toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('should navigate to meal planner when clicked', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: 'plan-1',
          weekStart: today.toISOString(),
          meals: [
            {
              id: 'meal-1',
              date: today.toISOString(),
              mealType: 'LUNCH',
              dishes: [
                { id: 'dish-1', dishName: 'Sandwich', recipeId: null, sortOrder: 0 },
              ],
            },
          ],
        },
        weekStart: today.toISOString().split('T')[0],
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sandwich')).toBeInTheDocument();
    });

    const widget = screen.getByText("Today's Meals").closest('div');
    widget?.click();

    expect(mockPush).toHaveBeenCalledWith('/dashboard/meals');
  });

  it('should display meals with legacy customName field', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: 'plan-1',
          weekStart: today.toISOString(),
          meals: [
            {
              id: 'meal-1',
              date: today.toISOString(),
              mealType: 'LUNCH',
              customName: 'Leftover Pizza',
              dishes: [],
            },
          ],
        },
        weekStart: today.toISOString().split('T')[0],
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Leftover Pizza')).toBeInTheDocument();
    });
  });

  it('should show multiple dishes for a single meal', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: 'plan-1',
          weekStart: today.toISOString(),
          meals: [
            {
              id: 'meal-1',
              date: today.toISOString(),
              mealType: 'DINNER',
              dishes: [
                { id: 'dish-1', dishName: 'Chicken', recipeId: 'recipe-1', sortOrder: 0 },
                { id: 'dish-2', dishName: 'Rice', recipeId: null, sortOrder: 1 },
                { id: 'dish-3', dishName: 'Broccoli', recipeId: null, sortOrder: 2 },
              ],
            },
          ],
        },
        weekStart: today.toISOString().split('T')[0],
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Chicken, Rice, Broccoli')).toBeInTheDocument();
    });
  });

  it('should show meal count badge', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: 'plan-1',
          weekStart: today.toISOString(),
          meals: [
            {
              id: 'meal-1',
              date: today.toISOString(),
              mealType: 'BREAKFAST',
              dishes: [{ id: 'dish-1', dishName: 'Toast', recipeId: null, sortOrder: 0 }],
            },
            {
              id: 'meal-2',
              date: today.toISOString(),
              mealType: 'LUNCH',
              dishes: [{ id: 'dish-2', dishName: 'Soup', recipeId: null, sortOrder: 0 }],
            },
            {
              id: 'meal-3',
              date: today.toISOString(),
              mealType: 'DINNER',
              dishes: [{ id: 'dish-3', dishName: 'Steak', recipeId: null, sortOrder: 0 }],
            },
          ],
        },
        weekStart: today.toISOString().split('T')[0],
      }),
    });

    render(<MealsWidget />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
