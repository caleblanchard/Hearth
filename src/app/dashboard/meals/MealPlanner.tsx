'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MealType } from '@/lib/enums';
import RecipeAutocomplete from '@/components/meals/RecipeAutocomplete';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
  const [mealTypes, setMealTypes] = useState<string[]>(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
  
  // New dish state
  const [addingDishToEntry, setAddingDishToEntry] = useState<string | null>(null);
  const [newDishName, setNewDishName] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Mobile: selected day index (defaults to today)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Get days array based on week start day
  const days = useMemo(() => {
    if (weekStartDay === 'SUNDAY') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [weekStartDay]);

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

          // Filter meal types to family's planned types (preserve display order)
          const ALL_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
          const plannedTypes: string[] = data.family?.settings?.plannedMealTypes ?? [];
          if (plannedTypes.length > 0) {
            setMealTypes(ALL_MEAL_TYPES.filter(m => plannedTypes.includes(m.toUpperCase())));
          }
          
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
      const currentDate = new Date(weekStart + 'T00:00:00'); // Parse as local date to get correct day-of-week
      const weekStartDate = getWeekStart(currentDate, weekStartDay);
      const weekStr = formatDate(weekStartDate);
      if (weekStr !== weekStart) {
        loadMealPlan(weekStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDay]);

  // Auto-select today's index when weekStart loads
  useEffect(() => {
    if (!weekStart) return;
    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dStr === todayStr) { setSelectedDayIndex(i); return; }
    }
    setSelectedDayIndex(0);
  }, [weekStart]);

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
        (meal) => {
          // meal.date is a string from JSON responses, or a Date from test mocks/legacy code
          const raw = meal.date as unknown;
          const mealDateStr = typeof raw === 'string'
            ? raw.split('T')[0]
            : formatDate(raw as Date);
          return mealDateStr === targetDate && meal.mealType === mealType.toUpperCase();
        }
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
          weekStart: weekStart,
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
    <div>
      {/* ── Shared constants ───────────────────────────────────────── */}
      {(() => {
        const MEAL_COLORS: Record<string, { border: string; headerBg: string; label: string }> = {
          Breakfast: { border: 'border-l-amber-400',  headerBg: 'bg-amber-50 dark:bg-amber-900/20',   label: 'text-amber-700 dark:text-amber-300' },
          Lunch:     { border: 'border-l-sky-400',    headerBg: 'bg-sky-50 dark:bg-sky-900/20',       label: 'text-sky-700 dark:text-sky-300' },
          Dinner:    { border: 'border-l-indigo-400', headerBg: 'bg-indigo-50 dark:bg-indigo-900/20', label: 'text-indigo-700 dark:text-indigo-300' },
          Snack:     { border: 'border-l-green-400',  headerBg: 'bg-green-50 dark:bg-green-900/20',   label: 'text-green-700 dark:text-green-300' },
        };
        const MEAL_EMOJIS: Record<string, string> = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snack: '🍎' };

        const t = new Date();
        const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

        const weekEnd = weekStart ? (() => {
          const d = new Date(weekStart + 'T00:00:00'); d.setDate(d.getDate() + 6); return d;
        })() : null;
        const weekLabel = weekStart && weekEnd
          ? `${new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${
              weekEnd.getMonth() === new Date(weekStart + 'T00:00:00').getMonth()
                ? weekEnd.getDate()
                : weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }`
          : '';

        const selDateStr = getDateForDay(selectedDayIndex);
        const selDateLabel = selDateStr
          ? new Date(selDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          : '';

        return (
          <>
            {/* ── Week nav (shared) ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPreviousWeek} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Previous week">
                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{weekLabel}</span>
              <button onClick={goToNextWeek} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Next week">
                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* ══ MOBILE layout (< sm) ═══════════════════════════════ */}
            <div className="sm:hidden">
              {/* Day selector strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
                {days.map((day, index) => {
                  const dStr = getDateForDay(index);
                  const dNum = dStr ? new Date(dStr + 'T00:00:00').getDate() : null;
                  const isToday = dStr === todayStr;
                  const isSelected = index === selectedDayIndex;
                  const hasMeals = mealTypes.some(mt => {
                    const e = getMealEntry(index, mt);
                    return e && (e.dishes.length > 0 || e.customName);
                  });
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDayIndex(index)}
                      className={`flex-shrink-0 flex flex-col items-center w-12 py-2.5 rounded-2xl transition-all ${
                        isSelected
                          ? 'bg-ember-700 text-white shadow-md'
                          : isToday
                          ? 'bg-ember-50 dark:bg-ember-900/30 text-ember-600 dark:text-ember-400'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide">{day[0]}</span>
                      <span className="text-lg font-bold leading-tight">{dNum}</span>
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${hasMeals ? (isSelected ? 'bg-white/70' : 'bg-ember-500') : 'bg-transparent'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Selected day label */}
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-0.5">{selDateLabel}</p>

              {/* Meal cards for selected day */}
              <div className="space-y-3">
                {mealTypes.map((mealType) => {
                  const entry = getMealEntry(selectedDayIndex, mealType);
                  const colors = MEAL_COLORS[mealType] || MEAL_COLORS['Dinner'];
                  const emoji = MEAL_EMOJIS[mealType] || '🍽️';
                  const isAddingDish = !!(entry && addingDishToEntry === entry.id);
                  return (
                    <div key={mealType} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                      {/* Meal type header */}
                      <div className={`flex items-center justify-between px-4 py-3 ${colors.headerBg}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{emoji}</span>
                          <span className={`text-sm font-semibold ${colors.label}`}>{mealType}</span>
                        </div>
                        {entry && (
                          <button
                            onClick={() => setAddingDishToEntry(isAddingDish ? null : entry.id)}
                            className="p-1.5 bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title="Add dish"
                          >
                            <PlusIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                        )}
                      </div>

                      <div className="p-3 space-y-2">
                        {entry ? (
                          <>
                            {entry.dishes && entry.dishes.length > 0 && (
                              <div className="space-y-1.5">
                                {entry.dishes.sort((a, b) => a.sortOrder - b.sortOrder).map((dish) => (
                                  <div
                                    key={dish.id}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 border-l-4 ${colors.border}${dish.recipeId ? ' cursor-pointer' : ''}`}
                                    onClick={() => dish.recipeId && router.push(`/dashboard/meals/recipes/${dish.recipeId}`)}
                                    role={dish.recipeId ? 'link' : undefined}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{dish.dishName}</p>
                                      {dish.recipeId && <p className="text-xs text-info mt-0.5">Recipe →</p>}
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteDish(dish.id); }}
                                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title="Remove"
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isAddingDish ? (
                              <div className="space-y-2 pt-1">
                                <RecipeAutocomplete
                                  value={newDishName}
                                  onChange={(name, recipe) => { setNewDishName(name); setSelectedRecipe(recipe); }}
                                  placeholder="Search recipes or type dish name…"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleAddDish(entry.id)} className="flex-1 py-2 text-sm bg-ember-700 hover:bg-ember-500 text-white rounded-xl font-medium transition-colors">Add</button>
                                  <button onClick={() => { setAddingDishToEntry(null); setNewDishName(''); setSelectedRecipe(null); }} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : entry.dishes.length === 0 ? (
                              <button
                                onClick={() => setAddingDishToEntry(entry.id)}
                                className="w-full py-3 text-sm text-gray-400 dark:text-gray-500 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-ember-300 dark:hover:border-ember-600 hover:text-ember-600 dark:hover:text-ember-400 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Add a dish
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <button
                            onClick={() => openAddDialog(selectedDayIndex, mealType)}
                            className="w-full py-3 text-sm text-gray-400 dark:text-gray-500 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-ember-300 dark:hover:border-ember-600 hover:text-ember-600 dark:hover:text-ember-400 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Plan {mealType.toLowerCase()}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══ DESKTOP layout (≥ sm) ══════════════════════════════ */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed border-collapse bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="w-24 p-3 text-left bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Meal</span>
                    </th>
                    {days.map((day, index) => {
                      const dStr = getDateForDay(index);
                      const dNum = dStr ? new Date(dStr + 'T00:00:00').getDate() : null;
                      const isToday = dStr === todayStr;
                      return (
                        <th key={day} className={`p-3 text-center bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-ember-50/60 dark:bg-ember-900/20' : ''}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-ember-600 dark:text-ember-400' : 'text-gray-500 dark:text-gray-400'}`}>{day}</span>
                          <div className="mt-1 flex justify-center">
                            <span className={`text-sm font-bold ${isToday ? 'w-6 h-6 rounded-full bg-ember-700 text-white flex items-center justify-center text-xs' : 'text-gray-700 dark:text-gray-300'}`}>{dNum}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {mealTypes.map((mealType) => {
                    const colors = MEAL_COLORS[mealType] || MEAL_COLORS['Dinner'];
                    const emoji = MEAL_EMOJIS[mealType] || '🍽️';
                    return (
                      <tr key={mealType} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <td className="p-3 border-r border-gray-100 dark:border-gray-700 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm leading-none">{emoji}</span>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{mealType}</span>
                          </div>
                        </td>
                        {days.map((day, dayIndex) => {
                          const entry = getMealEntry(dayIndex, mealType);
                          const dStr = getDateForDay(dayIndex);
                          const isToday = dStr === todayStr;
                          return (
                            <td key={`${mealType}-${day}`} className={`p-2 align-top border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-ember-50/30 dark:bg-ember-900/10' : ''}`}>
                              {entry ? (
                                <div className="space-y-1.5">
                                  {entry.dishes && entry.dishes.length > 0 ? (
                                    <div className="space-y-1">
                                      {entry.dishes.sort((a, b) => a.sortOrder - b.sortOrder).map((dish, dishIndex) => (
                                        <div
                                          key={dish.id}
                                          className={`group relative flex items-start gap-1 p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/60 border-l-4 ${colors.border}${dish.recipeId ? ' cursor-pointer' : ''}`}
                                          onClick={() => dish.recipeId && router.push(`/dashboard/meals/recipes/${dish.recipeId}`)}
                                          role={dish.recipeId ? 'link' : undefined}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2" title={dish.dishName}>{dish.dishName}</p>
                                            {dish.recipeId && <p className="text-xs text-info mt-0.5">recipe</p>}
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 flex-shrink-0">
                                            {dishIndex > 0 && <button onClick={(e) => { e.stopPropagation(); handleMoveDishUp(entry, dishIndex); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Move up"><ChevronUpIcon className="h-2.5 w-2.5" /></button>}
                                            {dishIndex < entry.dishes.length - 1 && <button onClick={(e) => { e.stopPropagation(); handleMoveDishDown(entry, dishIndex); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Move down"><ChevronDownIcon className="h-2.5 w-2.5" /></button>}
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDish(dish.id); }} className="p-0.5 hover:bg-red-200 dark:hover:bg-red-600 rounded" title="Delete"><TrashIcon className="h-2.5 w-2.5" /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : entry.customName ? (
                                    <div
                                      className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/60 border-l-4 border-l-gray-300 text-xs text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={() => { setSelectedEntry(entry); setFormData({ customName: entry.customName || '', notes: entry.notes || '' }); setShowEditDialog(true); }}
                                    >
                                      {entry.customName}
                                    </div>
                                  ) : null}

                                  {addingDishToEntry === entry.id ? (
                                    <div className="space-y-1">
                                      <RecipeAutocomplete value={newDishName} onChange={(name, recipe) => { setNewDishName(name); setSelectedRecipe(recipe); }} placeholder="Dish name..." autoFocus />
                                      <div className="flex gap-1">
                                        <button onClick={() => handleAddDish(entry.id)} className="flex-1 px-2 py-1 text-xs bg-ember-700 hover:bg-ember-500 text-white rounded-lg">Add</button>
                                        <button onClick={() => { setAddingDishToEntry(null); setNewDishName(''); setSelectedRecipe(null); }} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">✕</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setAddingDishToEntry(entry.id)} className="w-full px-1 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-0.5 transition-colors">
                                      <PlusIcon className="h-3 w-3" /> Add Dish
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button onClick={() => openAddDialog(dayIndex, mealType)} className="w-full py-2 text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-0.5 transition-colors">
                                  <PlusIcon className="h-3 w-3" /> Add
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Dialogs (slide-up sheet on mobile) ──────────────── */}
            {showAddDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" role="dialog">
                <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Meal</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="meal-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dish / Recipe</label>
                      <RecipeAutocomplete id="meal-name" value={formData.customName} onChange={(name, recipe) => { setFormData({ ...formData, customName: name }); setSelectedRecipe(recipe); }} placeholder="Search recipes or enter dish name..." />
                    </div>
                    <div>
                      <label htmlFor="meal-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                      <textarea id="meal-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" rows={3} />
                    </div>
                    <div className="flex gap-3 justify-end pt-1">
                      <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                      <button onClick={handleCreateMeal} className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-xl">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showEditDialog && selectedEntry && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" role="dialog">
                <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Meal</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-meal-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meal Name</label>
                      <input id="edit-meal-name" type="text" value={formData.customName} onChange={(e) => setFormData({ ...formData, customName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label htmlFor="edit-meal-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                      <textarea id="edit-meal-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" rows={3} />
                    </div>
                    <div className="flex gap-3 justify-between pt-1">
                      <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Delete</button>
                      <div className="flex gap-3">
                        <button onClick={() => setShowEditDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                        <button onClick={handleUpdateMeal} className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-xl">Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" role="dialog">
                <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Remove meal?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This will remove this meal entry and all its dishes.</p>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                    <button onClick={handleDeleteMeal} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Remove</button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
