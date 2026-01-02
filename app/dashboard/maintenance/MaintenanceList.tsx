'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MaintenanceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  season: string | null;
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  estimatedCost: number | null;
  notes: string | null;
}

interface MaintenanceResponse {
  items: MaintenanceItem[];
}

export default function MaintenanceList() {
  const router = useRouter();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming'>('all');

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = filter === 'upcoming'
        ? '/api/maintenance/upcoming?days=30'
        : '/api/maintenance';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load maintenance items');
      }

      const data: MaintenanceResponse = await response.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filter]);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      HVAC: 'HVAC',
      PLUMBING: 'Plumbing',
      ELECTRICAL: 'Electrical',
      EXTERIOR: 'Exterior',
      INTERIOR: 'Interior',
      LAWN_GARDEN: 'Lawn & Garden',
      APPLIANCES: 'Appliances',
      SAFETY: 'Safety',
      SEASONAL: 'Seasonal',
      OTHER: 'Other',
    };
    return labels[category] || category;
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      HVAC: '❄️',
      PLUMBING: '🚰',
      ELECTRICAL: '⚡',
      EXTERIOR: '🏠',
      INTERIOR: '🛋️',
      LAWN_GARDEN: '🌱',
      APPLIANCES: '🔧',
      SAFETY: '🚨',
      SEASONAL: '🍂',
      OTHER: '🔨',
    };
    return emojis[category] || '🔨';
  };

  const isOverdue = (nextDueAt: string | null): boolean => {
    if (!nextDueAt) return false;
    return new Date(nextDueAt) < new Date();
  };

  const isDueSoon = (nextDueAt: string | null): boolean => {
    if (!nextDueAt) return false;
    const dueDate = new Date(nextDueAt);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 7;
  };

  const getDueText = (nextDueAt: string | null): string | null => {
    if (!nextDueAt) return null;

    const dueDate = new Date(nextDueAt);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} days`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    if (daysUntilDue <= 7) return `Due in ${daysUntilDue} days`;
    return `Due ${dueDate.toLocaleDateString()}`;
  };

  const getLastCompletedText = (lastCompletedAt: string | null): string | null => {
    if (!lastCompletedAt) return 'Never completed';

    const completedDate = new Date(lastCompletedAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) return 'Completed today';
    if (daysSince === 1) return 'Completed yesterday';
    if (daysSince < 7) return `Completed ${daysSince} days ago`;
    return `Last completed ${completedDate.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading maintenance items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'upcoming'
              ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Upcoming & Overdue
        </button>
      </div>

      {/* Maintenance Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all'
              ? 'No maintenance items yet. Add tasks to get started!'
              : 'No upcoming or overdue tasks.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              {/* Item Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{getCategoryEmoji(item.category)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getCategoryLabel(item.category)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Frequency */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Frequency: {item.frequency}
                </p>
              </div>

              {/* Status Alerts */}
              <div className="space-y-2 mb-3">
                {item.nextDueAt && isOverdue(item.nextDueAt) && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-sm">
                    <span>⚠️</span>
                    <span>{getDueText(item.nextDueAt)}</span>
                  </div>
                )}
                {item.nextDueAt && !isOverdue(item.nextDueAt) && isDueSoon(item.nextDueAt) && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-sm">
                    <span>⏰</span>
                    <span>{getDueText(item.nextDueAt)}</span>
                  </div>
                )}
                {item.nextDueAt && !isOverdue(item.nextDueAt) && !isDueSoon(item.nextDueAt) && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm">
                    <span>📅</span>
                    <span>{getDueText(item.nextDueAt)}</span>
                  </div>
                )}
              </div>

              {/* Last Completed */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {getLastCompletedText(item.lastCompletedAt)}
              </p>

              {/* Estimated Cost */}
              {item.estimatedCost !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Est. cost: ${item.estimatedCost.toFixed(2)}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/dashboard/maintenance/${item.id}`)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
