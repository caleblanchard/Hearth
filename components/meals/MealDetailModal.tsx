'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { LinkIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

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
  notes: string | null;
  dishes: MealPlanDish[];
}

interface MealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealEntry: MealPlanEntry | null;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

export default function MealDetailModal({
  isOpen,
  onClose,
  mealEntry,
}: MealDetailModalProps) {
  if (!isOpen || !mealEntry) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="meal-detail-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2
              id="meal-detail-title"
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            >
              {MEAL_TYPE_LABELS[mealEntry.mealType] || mealEntry.mealType}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {formatDate(mealEntry.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Dishes */}
          {mealEntry.dishes && mealEntry.dishes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Dishes
              </h3>
              <div className="space-y-2">
                {mealEntry.dishes
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((dish, index) => (
                    <div
                      key={dish.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ember-700 text-white flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {dish.dishName}
                        </div>
                        {dish.recipeId && (
                          <Link
                            href={`/dashboard/meals/recipes/${dish.recipeId}`}
                            className="text-sm text-info hover:underline flex items-center gap-1 mt-1"
                            onClick={onClose}
                          >
                            <LinkIcon className="h-3 w-3" />
                            View Recipe
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No dishes added to this meal yet.
            </div>
          )}

          {/* Notes */}
          {mealEntry.notes && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notes
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {mealEntry.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
