'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MealType } from '@prisma/client';

interface MealPlanEntry {
  id: string;
  date: Date;
  mealType: string;
  customName: string | null;
  notes: string | null;
  recipeId: string | null;
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

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  // Get Monday of current week
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    return d;
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Load meal plan for current week
  const loadMealPlan = async (week: string) => {
    setLoading(true);
    setError(null);

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
      setMealPlan(data.mealPlan);
      setWeekStart(data.weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  };

  // Initialize with current week
  useEffect(() => {
    const monday = getMonday(new Date());
    const weekStr = formatDate(monday);
    loadMealPlan(weekStr);
  }, []);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const currentWeek = new Date(weekStart);
    currentWeek.setDate(currentWeek.getDate() - 7);
    const newWeek = formatDate(currentWeek);
    loadMealPlan(newWeek);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const currentWeek = new Date(weekStart);
    currentWeek.setDate(currentWeek.getDate() + 7);
    const newWeek = formatDate(currentWeek);
    loadMealPlan(newWeek);
  };

  // Get date for specific day of week
  const getDateForDay = (dayIndex: number): string => {
    if (!weekStart) return '';
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return formatDate(date);
  };

  // Get meal entry for specific day and meal type
  const getMealEntry = (dayIndex: number, mealType: string): MealPlanEntry | null => {
    if (!mealPlan) return null;
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
          customName: formData.customName,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create meal');
      }

      setShowAddDialog(false);
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
          Week of {weekStart ? new Date(weekStart).toLocaleDateString() : ''}
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
                      new Date(getDateForDay(index)).getDate()}
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
                      className="p-3 text-center border-l border-gray-200 dark:border-gray-700"
                    >
                      {entry ? (
                        <div
                          className="relative cursor-pointer p-2 rounded bg-info/10 dark:bg-info/20 hover:bg-info/20 dark:hover:bg-info/30"
                          onClick={() => openEditDialog(entry)}
                          onMouseEnter={() => setHoveredEntry(entry.id)}
                          onMouseLeave={() => setHoveredEntry(null)}
                        >
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {entry.customName}
                          </div>
                          {entry.notes && hoveredEntry === entry.id && (
                            <div className="absolute z-10 mt-2 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAddDialog(dayIndex, mealType)}
                          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  Meal Name
                </label>
                <input
                  id="meal-name"
                  type="text"
                  value={formData.customName}
                  onChange={(e) =>
                    setFormData({ ...formData, customName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Meal name"
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
