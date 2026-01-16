'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MealType } from '@/app/generated/prisma';
import RecipeAutocomplete from '@/components/meals/RecipeAutocomplete';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface MealPlanDish {
  id: string;
  dishName: string;
  recipeId: string | null;
  sortOrder: number;
}

interface MealPlanEntry {
  id: string;
  date: Date;
  mealType: string;
  customName: string | null;
  notes: string | null;
  recipeId: string | null;
  dishes: MealPlanDish[];
}

interface MealPlan {
  id: string;
  weekStart: Date;
  meals: MealPlanEntry[];
}

interface MealPlanResponse {
  mealPlan: MealPlan | null;
  weekStart: string;
}

export default function MealPlanner() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState<string>('');
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('BREAKFAST');
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntry | null>(null);
  const [formData, setFormData] = useState({
    customName: '',
    notes: '',
  });
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);
  const [weekStartDay, setWeekStartDay] = useState<'SUNDAY' | 'MONDAY'>('MONDAY');
  const [familyTimezone, setFamilyTimezone] = useState<string>('America/New_York');
  
  // New dish state
  const [addingDishToEntry, setAddingDishToEntry] = useState<string | null>(null);
  const [newDishName, setNewDishName] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Get days array based on week start day
  const days = useMemo(() => {
    if (weekStartDay === 'SUNDAY') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [weekStartDay]);
  
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  // Get start of week based on family setting
  const getWeekStart = (date: Date, startDay: 'SUNDAY' | 'MONDAY'): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (startDay === 'SUNDAY') {
      // Get Sunday of the week - already Sunday if day === 0
      const diff = day; // How many days since Sunday
      d.setDate(d.getDate() - diff);
    } else {
      // Get Monday of the week
      const diff = day === 0 ? 6 : day - 1; // Days since Monday
      d.setDate(d.getDate() - diff);
    }
    
    return d;
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load meal plan for current week
  const loadMealPlan = async (week: string) => {
    setLoading(true);
    setError(null);

    console.log('[MealPlanner] Loading meal plan for week:', week);

    try {
      const response = await fetch(`/api/meals/plan?week=${week}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load meal plan');
      }

      const data: MealPlanResponse = await response.json();
      console.log('[MealPlanner] Received meal plan:', data);
      setMealPlan(data.mealPlan);
      setWeekStart(data.weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  };

  // Fetch family settings to get week start day and timezone
  useEffect(() => {
    async function fetchFamilySettings() {
      try {
        // Use /api/family-data instead of /api/family due to Next.js routing bug
        const response = await fetch('/api/family-data');
        if (response.ok) {
          const data = await response.json();
          const weekStartDaySetting = data.family?.settings?.weekStartDay || 'MONDAY';
          const timezone = data.family?.timezone || 'America/New_York';
          
          console.log('[MealPlanner] Week start day setting:', weekStartDaySetting);
          console.log('[MealPlanner] Family timezone:', timezone);
          
          setWeekStartDay(weekStartDaySetting);
          setFamilyTimezone(timezone);
          
          // Get current date in family's timezone
          const now = new Date();
          const timeString = now.toLocaleString('en-US', { timeZone: timezone });
          const today = new Date(timeString);
          
          console.log('[MealPlanner] Today in timezone:', formatDate(today), today.getDay());
          const weekStartDate = getWeekStart(today, weekStartDaySetting);
          const weekStr = formatDate(weekStartDate);
          console.log('[MealPlanner] Calculated week start:', weekStr);
          loadMealPlan(weekStr);
        } else {
          // Fallback to default
          const weekStartDate = getWeekStart(new Date(), 'MONDAY');
          const weekStr = formatDate(weekStartDate);
          console.log('[MealPlanner] Fallback week start:', weekStr);
          loadMealPlan(weekStr);
        }
      } catch (err) {
        console.error('Failed to fetch family settings:', err);
        // Fallback to default
        const weekStartDate = getWeekStart(new Date(), 'MONDAY');
        const weekStr = formatDate(weekStartDate);
        loadMealPlan(weekStr);
      }
    }
    
    fetchFamilySettings();
  }, []);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const currentWeek = new Date(weekStart + 'T00:00:00');
    currentWeek.setDate(currentWeek.getDate() - 7);
    const newWeek = formatDate(currentWeek);
    loadMealPlan(newWeek);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const currentWeek = new Date(weekStart + 'T00:00:00');
    currentWeek.setDate(currentWeek.getDate() + 7);
    const newWeek = formatDate(currentWeek);
    loadMealPlan(newWeek);
  };

  // Reload meal plan when week start day changes
  useEffect(() => {
    if (weekStart && weekStartDay) {
      // Recalculate week start with new setting
      const currentDate = new Date(weekStart);
      const weekStartDate = getWeekStart(currentDate, weekStartDay);
      const weekStr = formatDate(weekStartDate);
      if (weekStr !== weekStart) {
        loadMealPlan(weekStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDay]);

  // Get date for specific day of week
  const getDateForDay = (dayIndex: number): string => {
    if (!weekStart) return '';
    const date = new Date(weekStart + 'T00:00:00'); // Parse as local date
    date.setDate(date.getDate() + dayIndex);
    return formatDate(date);
  };

  // Get meal entry for specific day and meal type
  const getMealEntry = (dayIndex: number, mealType: string): MealPlanEntry | null => {
    if (!mealPlan || !mealPlan.meals) return null;
    const targetDate = getDateForDay(dayIndex);
    return (
      mealPlan.meals.find(
        (meal) =>
          formatDate(new Date(meal.date)) === targetDate &&
          meal.mealType === mealType.toUpperCase()
      ) || null
    );
  };

  // Open add meal dialog
  const openAddDialog = (dayIndex: number, mealType: string) => {
    setSelectedDate(getDateForDay(dayIndex));
    setSelectedMealType(mealType.toUpperCase());
    setFormData({ customName: '', notes: '' });
    setShowAddDialog(true);
  };

  // Open edit dialog
  const openEditDialog = (entry: MealPlanEntry) => {
    setSelectedEntry(entry);
    setFormData({
      customName: entry.customName || '',
      notes: entry.notes || '',
    });
    setShowEditDialog(true);
  };

  // Create new meal entry
  const handleCreateMeal = async () => {
    try {
      const response = await fetch('/api/meals/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          mealType: selectedMealType,
          notes: formData.notes || null,
          dishes: formData.customName.trim()
            ? [
                {
                  dishName: formData.customName.trim(),
                  recipeId: selectedRecipe?.id || null,
                },
              ]
            : [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create meal');
      }

      setShowAddDialog(false);
      setSelectedRecipe(null);
      setFormData({ customName: '', notes: '' });
      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meal');
    }
  };

  // Update meal entry
  const handleUpdateMeal = async () => {
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/meals/plan/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customName: formData.customName,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meal');
      }

      setShowEditDialog(false);
      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meal');
    }
  };

  // Delete meal entry
  const handleDeleteMeal = async () => {
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/meals/plan/${selectedEntry.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      setShowDeleteConfirm(false);
      setShowEditDialog(false);
      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meal');
    }
  };

  // Add dish to existing meal
  const handleAddDish = async (entryId: string) => {
    if (!newDishName.trim()) return;

    try {
      const response = await fetch('/api/meals/plan/dishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealEntryId: entryId,
          dishName: newDishName.trim(),
          recipeId: selectedRecipe?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add dish');
      }

      setAddingDishToEntry(null);
      setNewDishName('');
      setSelectedRecipe(null);
      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dish');
    }
  };

  // Delete dish
  const handleDeleteDish = async (dishId: string) => {
    try {
      const response = await fetch(`/api/meals/plan/dishes/${dishId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete dish');
      }

      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dish');
    }
  };

  // Move dish up
  const handleMoveDishUp = async (entry: MealPlanEntry, dishIndex: number) => {
    if (dishIndex === 0) return;

    const dish = entry.dishes[dishIndex];
    const prevDish = entry.dishes[dishIndex - 1];

    try {
      // Swap sort orders
      await fetch(`/api/meals/plan/dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: dishIndex - 1 }),
      });

      await fetch(`/api/meals/plan/dishes/${prevDish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: dishIndex }),
      });

      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder dish');
    }
  };

  // Move dish down
  const handleMoveDishDown = async (entry: MealPlanEntry, dishIndex: number) => {
    if (dishIndex >= entry.dishes.length - 1) return;

    const dish = entry.dishes[dishIndex];
    const nextDish = entry.dishes[dishIndex + 1];

    try {
      // Swap sort orders
      await fetch(`/api/meals/plan/dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: dishIndex + 1 }),
      });

      await fetch(`/api/meals/plan/dishes/${nextDish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: dishIndex }),
      });

      loadMealPlan(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder dish');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Previous week"
        >
          ← Previous
        </button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Week of {weekStart ? new Date(weekStart + 'T00:00:00.000Z').toLocaleDateString('en-US', { timeZone: 'UTC' }) : ''}
        </h2>

        <button
          onClick={goToNextWeek}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Next week"
        >
          Next →
        </button>
      </div>

      {/* Meal Plan Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg shadow">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                Meal
              </th>
              {days.map((day, index) => (
                <th
                  key={day}
                  className="p-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  <div>{day}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getDateForDay(index) &&
                      new Date(getDateForDay(index) + 'T00:00:00').getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map((mealType) => (
              <tr
                key={mealType}
                className="border-b border-gray-200 dark:border-gray-700"
              >
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {mealType}
                </td>
                {days.map((day, dayIndex) => {
                  const entry = getMealEntry(dayIndex, mealType);
                  return (
                    <td
                      key={`${mealType}-${day}`}
                      className="p-2 align-top border-l border-gray-200 dark:border-gray-700"
                    >
                      {entry ? (
                        <div className="space-y-2">
                          {/* Dishes List */}
                          {entry.dishes && entry.dishes.length > 0 ? (
                            <div className="space-y-1">
                              {entry.dishes
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((dish, dishIndex) => (
                                  <div
                                    key={dish.id}
                                    className="group relative p-2 rounded bg-info/10 dark:bg-info/20 hover:bg-info/20 dark:hover:bg-info/30 text-left"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                          {dish.dishName}
                                        </div>
                                        {dish.recipeId && (
                                          <div className="text-xs text-info mt-0.5">
                                            (recipe)
                                          </div>
                                        )}
                                      </div>
                                      {/* Reorder and delete buttons (show on hover) */}
                                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 flex-shrink-0">
                                        {dishIndex > 0 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveDishUp(entry, dishIndex);
                                            }}
                                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                            title="Move up"
                                          >
                                            <ChevronUpIcon className="h-3 w-3" />
                                          </button>
                                        )}
                                        {dishIndex < entry.dishes.length - 1 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveDishDown(entry, dishIndex);
                                            }}
                                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                            title="Move down"
                                          >
                                            <ChevronDownIcon className="h-3 w-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDish(dish.id);
                                          }}
                                          className="p-0.5 hover:bg-red-200 dark:hover:bg-red-600 rounded"
                                          title="Delete dish"
                                        >
                                          <TrashIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : entry.customName ? (
                            // Legacy: Show customName if no dishes
                            <div className="p-2 rounded bg-info/10 dark:bg-info/20 text-sm text-gray-900 dark:text-gray-100">
                              {entry.customName}
                            </div>
                          ) : null}
                          
                          {/* Add Dish Button/Input */}
                          {addingDishToEntry === entry.id ? (
                            <div className="space-y-1">
                              <RecipeAutocomplete
                                value={newDishName}
                                onChange={(name, recipe) => {
                                  setNewDishName(name);
                                  setSelectedRecipe(recipe);
                                }}
                                placeholder="Dish name..."
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAddDish(entry.id)}
                                  className="flex-1 px-2 py-1 text-xs bg-ember-700 hover:bg-ember-500 text-white rounded"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingDishToEntry(null);
                                    setNewDishName('');
                                    setSelectedRecipe(null);
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingDishToEntry(entry.id)}
                              className="w-full px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center gap-1"
                            >
                              <PlusIcon className="h-3 w-3" />
                              Add Dish
                            </button>
                          )}
                          
                          {/* Notes indicator */}
                          {entry.notes && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                              Note: {entry.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAddDialog(dayIndex, mealType)}
                          className="w-full px-2 py-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          aria-label="Add meal"
                        >
                          + Add
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {!mealPlan && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No meals planned for this week yet.
          </p>
        </div>
      )}

      {/* Add Meal Dialog */}
      {showAddDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add Meal
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="meal-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Dish Name
                </label>
                <RecipeAutocomplete
                  value={formData.customName}
                  onChange={(name, recipe) => {
                    setFormData({ ...formData, customName: name });
                    setSelectedRecipe(recipe);
                  }}
                  placeholder="Search recipes or enter dish name..."
                />
              </div>
              <div>
                <label
                  htmlFor="meal-notes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="meal-notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeal}
                  className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-lg"
                  aria-label="Save"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Dialog */}
      {showEditDialog && selectedEntry && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Meal
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-meal-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Meal Name
                </label>
                <input
                  id="edit-meal-name"
                  type="text"
                  value={formData.customName}
                  onChange={(e) =>
                    setFormData({ ...formData, customName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-meal-notes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="edit-meal-notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  aria-label="Delete"
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMeal}
                    className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-lg"
                    aria-label="Save"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this meal entry?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMeal}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                aria-label="Confirm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
