'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MaintenanceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  seasonalMonths: string[] | null;
  estimatedCost: number | null;
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export default function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<MaintenanceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;

    const loadItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/maintenance/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Maintenance item not found');
          } else {
            setError('Failed to load maintenance item');
          }
          return;
        }

        const data = await response.json();
        setItem(data.item);
      } catch (err) {
        setError('Failed to load maintenance item');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [resolvedParams]);

  const handleComplete = async () => {
    if (!resolvedParams?.id || !confirm('Mark this maintenance task as complete?')) return;

    try {
      setCompleting(true);
      const response = await fetch(`/api/maintenance/${resolvedParams.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });

      if (response.ok) {
        // Reload the item to get updated dates
        const updatedResponse = await fetch(`/api/maintenance/${resolvedParams.id}`);
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setItem(data.item);
        }
      } else {
        alert('Failed to complete maintenance task');
      }
    } catch (err) {
      alert('Failed to complete maintenance task');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    if (!confirm('Are you sure you want to delete this maintenance item?')) return;

    try {
      const response = await fetch(`/api/maintenance/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/maintenance');
      } else {
        alert('Failed to delete maintenance item');
      }
    } catch (err) {
      alert('Failed to delete maintenance item');
    }
  };

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

  const getFrequencyLabel = (frequency: string): string => {
    const labels: Record<string, string> = {
      WEEKLY: 'Weekly',
      BIWEEKLY: 'Every 2 weeks',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMIANNUAL: 'Twice a year',
      ANNUAL: 'Yearly',
      BIENNIAL: 'Every 2 years',
      AS_NEEDED: 'As needed',
    };
    return labels[frequency] || frequency;
  };

  const isOverdue = (nextDueAt: string | null): boolean => {
    if (!nextDueAt) return false;
    return new Date(nextDueAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error || 'Item not found'}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/maintenance')}
          className="mt-4 text-ember-700 dark:text-ember-400 hover:underline"
        >
          ← Back to Maintenance
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/maintenance')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Maintenance
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {item.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {getCategoryLabel(item.category)}
              </span>
              <span>•</span>
              <span>{getFrequencyLabel(item.frequency)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5" />
              Complete
            </button>
            <button
              onClick={() => router.push(`/dashboard/maintenance/${item.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <PencilIcon className="h-5 w-5" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {item.nextDueAt && isOverdue(item.nextDueAt) && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg">
          <span className="text-xl">⚠️</span>
          <span className="font-medium">Overdue: Due {new Date(item.nextDueAt).toLocaleDateString()}</span>
        </div>
      )}

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Description */}
          {item.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* Schedule */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Frequency</p>
                <p className="text-gray-900 dark:text-white">{getFrequencyLabel(item.frequency)}</p>
              </div>
              {item.seasonalMonths && item.seasonalMonths.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Seasonal</p>
                  <p className="text-gray-900 dark:text-white">{item.seasonalMonths.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              {item.lastCompletedAt && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Completed</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(item.lastCompletedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {item.nextDueAt && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Due</p>
                  <p className={`font-semibold ${isOverdue(item.nextDueAt) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {new Date(item.nextDueAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Estimated Cost */}
          {item.estimatedCost !== null && item.estimatedCost !== undefined && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Estimated Cost</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Number(item.estimatedCost).toFixed(2)}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium mb-1">Created</p>
                <p>{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium mb-1">Last Updated</p>
                <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
