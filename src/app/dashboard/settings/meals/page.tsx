'use client';

import { useState, useEffect } from 'react';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const ALL_MEAL_TYPES = [
  { id: 'BREAKFAST', label: 'Breakfast' },
  { id: 'LUNCH', label: 'Lunch' },
  { id: 'DINNER', label: 'Dinner' },
  { id: 'SNACK', label: 'Snack' },
];

export default function MealSettingsPage() {
  const { isParent, loading: memberLoading } = useCurrentMember();
  const [plannedMealTypes, setPlannedMealTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isParent && !memberLoading) {
      setLoading(false);
      return;
    }
    if (!isParent) return;

    async function fetchSettings() {
      try {
        const res = await fetch('/api/family-data');
        if (res.ok) {
          const data = await res.json();
          const types = data.family?.settings?.plannedMealTypes;
          setPlannedMealTypes(
            Array.isArray(types) && types.length > 0
              ? types
              : ALL_MEAL_TYPES.map(m => m.id)
          );
        }
      } catch {
        // use defaults
        setPlannedMealTypes(ALL_MEAL_TYPES.map(m => m.id));
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [isParent, memberLoading]);

  const toggle = (id: string) => {
    setPlannedMealTypes(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(t => t !== id);
      }
      return [...prev, id];
    });
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    if (plannedMealTypes.length === 0) {
      setError('At least one meal type must be selected.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/family-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedMealTypes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (memberLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ember-600" />
      </div>
    );
  }

  if (!isParent) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Only parents can manage meal settings.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Choose which meal types to show in the weekly meal planner. At least one must be selected.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 mb-6">
        {ALL_MEAL_TYPES.map(meal => {
          const enabled = plannedMealTypes.includes(meal.id);
          const isLast = plannedMealTypes.length === 1 && enabled;
          return (
            <label
              key={meal.id}
              className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors${isLast ? ' opacity-50' : ''}`}
            >
              <span className="text-base font-medium text-gray-900 dark:text-white">{meal.label}</span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={isLast}
                onChange={() => toggle(meal.id)}
                className="h-5 w-5 rounded border-gray-300 text-ember-600 focus:ring-ember-500 cursor-pointer"
              />
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
