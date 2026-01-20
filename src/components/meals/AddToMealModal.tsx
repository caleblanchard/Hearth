'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddToMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
}

interface ExistingMeal {
  id: string;
  date: Date;
  mealType: string;
  dishCount: number;
}

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

export default function AddToMealModal({
  isOpen,
  onClose,
  recipeId,
  recipeName,
}: AddToMealModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [existingMeals, setExistingMeals] = useState<ExistingMeal[]>([]);
  const [selectedExistingMeal, setSelectedExistingMeal] = useState<string>('');
  const [addToExisting, setAddToExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-select meal type based on current time
  useEffect(() => {
    if (isOpen && !selectedMealType) {
      const hour = new Date().getHours();
      if (hour < 11) {
        setSelectedMealType('BREAKFAST');
      } else if (hour < 16) {
        setSelectedMealType('LUNCH');
      } else {
        setSelectedMealType('DINNER');
      }
    }
  }, [isOpen, selectedMealType]);

  // Set default date to today
  useEffect(() => {
    if (isOpen && !selectedDate) {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen, selectedDate]);

  // Fetch existing meals for selected date
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchExistingMeals() {
      try {
        const date = new Date(selectedDate);
        const weekStart = getMonday(date);
        const weekStr = weekStart.toISOString().split('T')[0];

        const response = await fetch(`/api/meals/plan?week=${weekStr}`);
        if (response.ok) {
          const data = await response.json();
          if (data.mealPlan) {
            const mealsOnDate = data.mealPlan.meals.filter(
              (meal: any) =>
                new Date(meal.date).toISOString().split('T')[0] === selectedDate
            );
            setExistingMeals(
              mealsOnDate.map((meal: any) => ({
                id: meal.id,
                date: meal.date,
                mealType: meal.mealType,
                dishCount: meal.dishes?.length || 0,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching existing meals:', err);
      }
    }

    fetchExistingMeals();
  }, [selectedDate]);

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    return d;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (addToExisting && selectedExistingMeal) {
        // Add to existing meal
        const response = await fetch('/api/meals/plan/dishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mealEntryId: selectedExistingMeal,
            recipeId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add dish to meal');
        }
      } else {
        // Create new meal
        const response = await fetch('/api/meals/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            mealType: selectedMealType,
            dishes: [{ recipeId }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create meal');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setSelectedDate('');
        setSelectedMealType('');
        setSelectedExistingMeal('');
        setAddToExisting(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="add-to-meal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2
            id="add-to-meal-title"
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            Add to Meal Plan
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="text-green-600 dark:text-green-400 text-lg font-semibold">
                ✓ Added to meal plan!
              </div>
            </div>
          ) : (
            <>
              {/* Recipe Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipe
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                  {recipeName}
                </div>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="meal-date"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Date
                </label>
                <input
                  id="meal-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedExistingMeal('');
                    setAddToExisting(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Existing Meals or New Meal */}
              {existingMeals.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add to existing meal or create new?
                  </label>
                  <div className="space-y-2">
                    {/* Existing meals */}
                    {existingMeals.map((meal) => (
                      <button
                        key={meal.id}
                        onClick={() => {
                          setSelectedExistingMeal(meal.id);
                          setAddToExisting(true);
                        }}
                        className={`w-full p-3 text-left border rounded-lg transition-colors ${
                          selectedExistingMeal === meal.id
                            ? 'border-ember-700 bg-ember-50 dark:bg-ember-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {MEAL_TYPE_LABELS[meal.mealType]}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {meal.dishCount} dish{meal.dishCount !== 1 ? 'es' : ''}
                        </div>
                      </button>
                    ))}

                    {/* Create new meal option */}
                    <button
                      onClick={() => {
                        setSelectedExistingMeal('');
                        setAddToExisting(false);
                      }}
                      className={`w-full p-3 text-left border rounded-lg transition-colors ${
                        !addToExisting
                          ? 'border-ember-700 bg-ember-50 dark:bg-ember-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Create new meal
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Meal Type (only for new meals) */}
              {!addToExisting && (
                <div>
                  <label
                    htmlFor="meal-type"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Meal Type
                  </label>
                  <select
                    id="meal-type"
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {MEAL_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!addToExisting && !selectedMealType)}
              className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add to Meal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
