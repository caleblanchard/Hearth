'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import RoutineExecutionView from '@/components/routines/RoutineExecutionView';
import RoutineBuilder from '@/components/routines/RoutineBuilder';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';

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
  assignedTo: string | null;
  isWeekday: boolean;
  isWeekend: boolean;
  steps: RoutineStep[];
  completedToday?: boolean;
  completedAt?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

const TYPE_LABELS: Record<string, string> = {
  MORNING: '🌅 Morning',
  BEDTIME: '🌙 Bedtime',
  HOMEWORK: '📚 Homework',
  AFTER_SCHOOL: '🎒 After School',
  CUSTOM: '⭐ Custom',
};

const TYPE_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  BEDTIME: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  HOMEWORK: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  AFTER_SCHOOL: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CUSTOM: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function RoutinesPage() {
  const router = useRouter();
  const { isParent, member, loading: memberLoading } = useCurrentMember();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; routineId: string | null }>({ isOpen: false, routineId: null });
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false, title: '', message: '', type: 'success',
  });

  useEffect(() => {
    if (!memberLoading) {
      fetchRoutines();
      if (isParent) fetchFamilyMembers();
    }
  }, [memberLoading, isParent]);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/routines');
      if (res.ok) {
        const data = await res.json();
        setRoutines(data.routines || []);
      }
    } catch (err) {
      console.error('Error fetching routines:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('/api/family/members');
      if (res.ok) {
        const data = await res.json();
        setFamilyMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching family members:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.routineId) return;
    try {
      const res = await fetch(`/api/routines/${confirmDelete.routineId}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutines(prev => prev.filter(r => r.id !== confirmDelete.routineId));
        setAlert({ isOpen: true, title: 'Deleted', message: 'Routine deleted successfully.', type: 'success' });
      } else {
        setAlert({ isOpen: true, title: 'Error', message: 'Failed to delete routine.', type: 'error' });
      }
    } catch {
      setAlert({ isOpen: true, title: 'Error', message: 'Failed to delete routine.', type: 'error' });
    } finally {
      setConfirmDelete({ isOpen: false, routineId: null });
    }
  };

  const handleSave = (saved: Routine) => {
    if (editingRoutine) {
      setRoutines(prev => prev.map(r => r.id === saved.id ? saved : r));
    } else {
      setRoutines(prev => [...prev, saved]);
    }
    setShowBuilder(false);
    setEditingRoutine(null);
  };

  const handleCompleted = () => {
    fetchRoutines();
    setActiveRoutine(null);
  };

  const totalMinutes = (routine: Routine) =>
    routine.steps.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  const scheduleLabel = (routine: Routine) => {
    if (routine.isWeekday && routine.isWeekend) return 'Every day';
    if (routine.isWeekday) return 'Weekdays';
    if (routine.isWeekend) return 'Weekends';
    return '';
  };

  if (memberLoading || loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 dark:border-ember-500 mx-auto" />
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading routines...</p>
      </div>
    );
  }

  if (activeRoutine) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => setActiveRoutine(null)}
          className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          ← Back to Routines
        </button>
        <RoutineExecutionView routine={activeRoutine} onComplete={handleCompleted} />
      </div>
    );
  }

  if (showBuilder) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => { setShowBuilder(false); setEditingRoutine(null); }}
          className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          ← Back to Routines
        </button>
        <RoutineBuilder
          routine={editingRoutine || undefined}
          familyMembers={familyMembers}
          onSave={handleSave}
          onCancel={() => { setShowBuilder(false); setEditingRoutine(null); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Routines</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isParent ? 'Manage and track family routines' : 'Complete your daily routines'}
          </p>
        </div>
        {isParent && (
          <button
            onClick={() => { setEditingRoutine(null); setShowBuilder(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors sm:flex-shrink-0"
          >
            <PlusIcon className="h-5 w-5" />
            New Routine
          </button>
        )}
      </div>

      {/* Empty state */}
      {routines.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
          <CheckCircleIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No routines yet</h3>
          {isParent ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create routines to help your family build consistent habits.
              </p>
              <button
                onClick={() => { setEditingRoutine(null); setShowBuilder(true); }}
                className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
              >
                Create First Routine
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No routines have been assigned yet.</p>
          )}
        </div>
      )}

      {/* Routines grid */}
      {routines.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {routines.map(routine => (
            <div
              key={routine.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex flex-col gap-4 ${
                routine.completedToday ? 'opacity-75' : ''
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{routine.name}</h3>
                    {routine.completedToday && (
                      <CheckCircleSolid className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[routine.type] || TYPE_COLORS.CUSTOM}`}>
                      {TYPE_LABELS[routine.type] || routine.type}
                    </span>
                    {scheduleLabel(routine) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{scheduleLabel(routine)}</span>
                    )}
                  </div>
                </div>

                {isParent && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingRoutine(routine); setShowBuilder(true); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                      aria-label="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ isOpen: true, routineId: routine.id })}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                      aria-label="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{routine.steps.length} step{routine.steps.length !== 1 ? 's' : ''}</span>
                {totalMinutes(routine) > 0 && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {totalMinutes(routine)} min
                  </span>
                )}
              </div>

              {/* Action */}
              {routine.completedToday ? (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircleSolid className="h-4 w-4" />
                  Completed today
                  {routine.completedAt && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                      at {new Date(routine.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setActiveRoutine(routine)}
                  className="w-full py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Start Routine
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Routine"
        message="Are you sure you want to delete this routine? This cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete({ isOpen: false, routineId: null })}
      />

      <AlertModal
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(a => ({ ...a, isOpen: false }))}
      />
    </div>
  );
}
