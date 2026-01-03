'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SparklesIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Chore {
  id: string;
  name: string;
  description?: string;
  status: string;
  creditValue: number;
  difficulty: string;
  dueDate: string;
  requiresApproval: boolean;
  notes?: string;
}

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchChores = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setChores(data.chores || []);
      }
    } catch (error) {
      console.error('Failed to fetch chores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChores();
  }, []);

  const handleComplete = async (choreId: string) => {
    setCompletingId(choreId);
    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        alert(data.message);
        // Refresh chores list
        await fetchChores();
      } else {
        alert(data.error || 'Failed to complete chore');
      }
    } catch (error) {
      console.error('Error completing chore:', error);
      alert('Failed to complete chore');
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'COMPLETED':
        return 'bg-info/20 text-info dark:bg-info/30 dark:text-info';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-600 dark:text-green-400';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'HARD':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Chores
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your chores to earn credits!
          </p>
        </div>

        {/* Chores List */}
        {chores.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No chores assigned for today!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chores.map((chore) => (
              <div
                key={chore.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {chore.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(
                          chore.status
                        )}`}
                      >
                        {chore.status}
                      </span>
                    </div>
                    {chore.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {chore.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span
                        className={`font-medium ${getDifficultyColor(
                          chore.difficulty
                        )}`}
                      >
                        {chore.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        {chore.creditValue} credits
                      </span>
                      {chore.requiresApproval && (
                        <span className="flex items-center gap-1 text-ember-700 dark:text-ember-500">
                          <CheckIcon className="h-4 w-4" />
                          Requires approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {chore.notes && chore.status === 'REJECTED' && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <strong>Rejected:</strong> {chore.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {chore.status === 'PENDING' || chore.status === 'REJECTED' ? (
                    <button
                      onClick={() => handleComplete(chore.id)}
                      disabled={completingId === chore.id}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      {completingId === chore.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          Mark Complete
                        </>
                      )}
                    </button>
                  ) : chore.status === 'COMPLETED' ? (
                    <div className="px-6 py-2 bg-info/20 text-info dark:bg-info/30 dark:text-info font-semibold rounded-lg flex items-center gap-2">
                      <ClockIcon className="h-5 w-5" />
                      Waiting for approval
                    </div>
                  ) : chore.status === 'APPROVED' ? (
                    <div className="px-6 py-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-semibold rounded-lg flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      Completed & Approved!
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
