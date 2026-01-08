'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MealPlanDish {
  id: string;
  dishName: string;
  recipeId: string | null;
  sortOrder: number;
}

interface MealPlanEntry {
  id: string;
  date: string;
  mealType: string;
  customName: string | null;
  dishes: MealPlanDish[];
}

interface MealPlan {
  id: string;
  weekStart: string;
  meals: MealPlanEntry[];
}

interface MealPlanResponse {
  mealPlan: MealPlan | null;
  weekStart: string;
}

export default function MealsWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<MealPlanEntry[]>([]);

  useEffect(() => {
    async function fetchTodaysMeals() {
      try {
        // Get today's date in YYYY-MM-DD format (local date)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Fetch the meal plan for this week
        const response = await fetch(`/api/meals/plan?week=${todayStr}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch meal plan');
        }

        const data: MealPlanResponse = await response.json();

        // Filter meals for today only (compare date strings to avoid timezone issues)
        if (data.mealPlan?.meals) {
          const mealsForToday = data.mealPlan.meals.filter(meal => {
            // Extract YYYY-MM-DD from meal.date (which is stored as UTC)
            const mealDateStr = meal.date.split('T')[0];
            return mealDateStr === todayStr;
          });
          setTodaysMeals(mealsForToday);
        } else {
          setTodaysMeals([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meals');
      } finally {
        setLoading(false);
      }
    }

    fetchTodaysMeals();
  }, []);

  const getMealTypeLabel = (mealType: string): string => {
    return mealType.charAt(0) + mealType.slice(1).toLowerCase();
  };

  const getMealDisplayName = (meal: MealPlanEntry): string => {
    // Support legacy customName field
    if (meal.customName) {
      return meal.customName;
    }
    
    // Use dishes array
    if (meal.dishes && meal.dishes.length > 0) {
      return meal.dishes.map(d => d.dishName).join(', ');
    }
    
    return 'No meal specified';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Today's Meals
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading meals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Today's Meals
        </h2>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push('/dashboard/meals')}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Today's Meals
        </h2>
        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
          {todaysMeals.length}
        </span>
      </div>
      
      {todaysMeals.length > 0 ? (
        <div className="space-y-2">
          {todaysMeals.map(meal => (
            <div
              key={meal.id}
              className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getMealTypeLabel(meal.mealType)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {getMealDisplayName(meal)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No meals planned for today.
        </p>
      )}
    </div>
  );
}
