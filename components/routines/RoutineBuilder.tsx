'use client';

import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface RoutineStep {
  id?: string;
  name: string;
  icon?: string | null;
  estimatedMinutes?: number | null;
  sortOrder: number;
}

interface Routine {
  id: string;
  name: string;
  type: string;
  assignedTo: string | null;
  isWeekday: boolean;
  isWeekend: boolean;
  steps?: RoutineStep[];
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

interface RoutineBuilderProps {
  routine?: Routine;
  familyMembers: FamilyMember[];
  onSave: (routine: any) => void;
  onCancel: () => void;
}

export default function RoutineBuilder({
  routine,
  familyMembers,
  onSave,
  onCancel,
}: RoutineBuilderProps) {
  const [name, setName] = useState(routine?.name || '');
  const [type, setType] = useState(routine?.type || 'MORNING');
  const [assignedTo, setAssignedTo] = useState<string | null>(routine?.assignedTo || null);
  const [isWeekday, setIsWeekday] = useState(routine?.isWeekday ?? true);
  const [isWeekend, setIsWeekend] = useState(routine?.isWeekend ?? true);
  const [steps, setSteps] = useState<RoutineStep[]>(
    routine?.steps || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEdit = !!routine;

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: '',
        icon: null,
        estimatedMinutes: null,
        sortOrder: steps.length,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Update sort order
    newSteps.forEach((step, i) => {
      step.sortOrder = i;
    });
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof RoutineStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value,
    };
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Update sort order
    newSteps.forEach((step, i) => {
      step.sortOrder = i;
    });

    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    // Validate
    if (!name.trim()) {
      setValidationError('Name is required');
      return;
    }

    setLoading(true);

    try {
      const body = {
        name: name.trim(),
        type,
        assignedTo: assignedTo || null,
        isWeekday,
        isWeekend,
        steps: steps.map(step => ({
          name: step.name,
          icon: step.icon || null,
          estimatedMinutes: step.estimatedMinutes || null,
        })),
      };

      const url = isEdit ? `/api/routines/${routine.id}` : '/api/routines';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save routine');
      }

      onSave(data.routine);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {isEdit ? 'Edit Routine' : 'Create Routine'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Routine Name */}
        <div>
          <label
            htmlFor="routine-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Routine Name
          </label>
          <input
            id="routine-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Morning Routine"
          />
        </div>

        {/* Type */}
        <div>
          <label
            htmlFor="routine-type"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Type
          </label>
          <select
            id="routine-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="MORNING">Morning</option>
            <option value="BEDTIME">Bedtime</option>
            <option value="HOMEWORK">Homework</option>
            <option value="AFTER_SCHOOL">After School</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        {/* Assign To */}
        <div>
          <label
            htmlFor="routine-assign"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Assign To
          </label>
          <select
            id="routine-assign"
            value={assignedTo || ''}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Children</option>
            {familyMembers
              .filter((m) => m.role === 'CHILD')
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </div>

        {/* Weekday/Weekend */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Schedule
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isWeekday}
                onChange={(e) => setIsWeekday(e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Weekdays</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isWeekend}
                onChange={(e) => setIsWeekend(e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Weekends</span>
            </label>
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Steps
            </label>
            <button
              type="button"
              onClick={addStep}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add Step
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateStep(index, 'name', e.target.value)}
                  placeholder="Step name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />

                <input
                  type="text"
                  value={step.icon || ''}
                  onChange={(e) => updateStep(index, 'icon', e.target.value)}
                  placeholder="Icon"
                  className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-center"
                />

                <input
                  type="number"
                  value={step.estimatedMinutes || ''}
                  onChange={(e) =>
                    updateStep(index, 'estimatedMinutes', e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Minutes"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="p-2 text-red-600 hover:text-red-700"
                  aria-label="Remove"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
          </div>
        )}

        {/* API Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg"
          >
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Routine'}
          </button>
        </div>
      </form>
    </div>
  );
}
