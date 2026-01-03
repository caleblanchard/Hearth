'use client';

import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon as CheckCircleOutlineIcon } from '@heroicons/react/24/outline';

interface RoutineStep {
  id: string;
  name: string;
  icon?: string | null;
  estimatedMinutes?: number | null;
  sortOrder: number;
}

interface Routine {
  id: string;
  name: string;
  type: string;
  steps: RoutineStep[];
  completedToday?: boolean;
  completedAt?: string;
}

interface RoutineExecutionViewProps {
  routine: Routine;
  onComplete: () => void;
}

export default function RoutineExecutionView({
  routine,
  onComplete,
}: RoutineExecutionViewProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleStep = (stepId: string) => {
    const newCheckedSteps = new Set(checkedSteps);
    if (newCheckedSteps.has(stepId)) {
      newCheckedSteps.delete(stepId);
    } else {
      newCheckedSteps.add(stepId);
    }
    setCheckedSteps(newCheckedSteps);
  };

  const allStepsCompleted = routine.steps.length > 0 && routine.steps.every((step) =>
    checkedSteps.has(step.id)
  );

  const totalEstimatedMinutes = routine.steps.reduce(
    (sum, step) => sum + (step.estimatedMinutes || 0),
    0
  );

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/routines/${routine.id}/complete`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete routine');
      }

      setSuccess(data.message || 'Routine completed successfully!');
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (routine.completedToday) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {routine.name}
        </h3>
        <p className="text-green-700 dark:text-green-300 font-medium">
          Already completed today!
        </p>
        {routine.completedAt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Completed at {new Date(routine.completedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {routine.name}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-3 py-1 bg-ember-300/30 dark:bg-slate-900/30 text-ember-700 dark:text-ember-300 rounded-full">
            {routine.type.charAt(0) + routine.type.slice(1).toLowerCase().replace('_', ' ')}
          </span>
          {totalEstimatedMinutes > 0 && (
            <span>Total: {totalEstimatedMinutes} minutes</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {checkedSteps.size} of {routine.steps.length} steps completed
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {routine.steps.length > 0
              ? Math.round((checkedSteps.size / routine.steps.length) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-ember-700 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${routine.steps.length > 0
                ? (checkedSteps.size / routine.steps.length) * 100
                : 0
                }%`,
            }}
          />
        </div>
      </div>

      {/* Steps */}
      {routine.steps.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No steps defined for this routine
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {routine.steps.map((step) => {
            const isChecked = checkedSteps.has(step.id);
            return (
              <label
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${isChecked
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleStep(step.id)}
                  className="sr-only"
                />
                {isChecked ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <CheckCircleOutlineIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                )}

                {step.icon && (
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                )}

                <div className="flex-1">
                  <p
                    className={`font-medium ${isChecked
                      ? 'text-green-900 dark:text-green-100 line-through'
                      : 'text-gray-900 dark:text-white'
                      }`}
                  >
                    {step.name}
                  </p>
                  {step.estimatedMinutes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {step.estimatedMinutes} min
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-300 font-medium text-center">
            {success}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 font-medium text-center">
            {error}
          </p>
        </div>
      )}

      {/* Complete Button */}
      {routine.steps.length > 0 && (
        <button
          onClick={handleComplete}
          disabled={!allStepsCompleted || loading}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
        >
          {loading ? 'Completing...' : 'Complete Routine'}
        </button>
      )}
    </div>
  );
}
