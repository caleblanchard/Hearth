'use client';

import { useState, useEffect } from 'react';
import { Wrench, AlertCircle } from 'lucide-react';

interface MaintenanceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  nextDueAt: string | null;
  lastCompletedAt: string | null;
  intervalDays: number | null;
  assignedTo: string | null;
}

interface MaintenanceWidgetData {
  items: MaintenanceItem[];
}

export default function MaintenanceWidget() {
  const [data, setData] = useState<MaintenanceWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaintenance();
  }, []);

  async function fetchMaintenance() {
    try {
      setLoading(true);
      setError(null);

      // Fetch upcoming items within 7 days
      const response = await fetch('/api/maintenance/upcoming?days=7');

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance data');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance');
    } finally {
      setLoading(false);
    }
  }

  // Format due date display
  const formatDueDate = (dateString: string): { text: string; isOverdue: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        text: daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`,
        isOverdue: true,
      };
    }

    if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false };
    }

    if (diffDays === 1) {
      return { text: 'Due tomorrow', isOverdue: false };
    }

    return { text: `Due in ${diffDays} days`, isOverdue: false };
  };

  // Get color for category
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      HVAC: 'bg-info/20 dark:bg-info/30 text-info dark:text-info',
      PLUMBING: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
      ELECTRICAL: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      EXTERIOR: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      INTERIOR: 'bg-ember-300/30 dark:bg-slate-900/30 text-ember-700 dark:text-ember-300',
      LAWN_GARDEN: 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300',
      APPLIANCES: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      SAFETY: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      SEASONAL: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
      OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    return colors[category] || colors.OTHER;
  };

  // Sort items: overdue first, then by due date
  const sortedItems = [...(data?.items || [])].sort((a, b) => {
    if (!a.nextDueAt) return 1;
    if (!b.nextDueAt) return -1;

    const timeA = new Date(a.nextDueAt).getTime();
    const timeB = new Date(b.nextDueAt).getTime();
    return timeA - timeB;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Maintenance
        </h2>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load maintenance
        </div>
      )}

      {!loading && !error && sortedItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No maintenance scheduled
        </div>
      )}

      {!loading && !error && sortedItems.length > 0 && (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const { text: dueText, isOverdue } = item.nextDueAt
              ? formatDueDate(item.nextDueAt)
              : { text: '', isOverdue: false };

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${
                  isOverdue
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      {isOverdue && (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      {item.nextDueAt && (
                        <span
                          className={`text-sm ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {dueText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {item.description}
                  </div>
                )}

                {item.assignedTo && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Assigned to: {item.assignedTo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
