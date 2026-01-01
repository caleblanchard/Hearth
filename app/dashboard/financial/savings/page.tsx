'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  iconName: string;
  color: string;
  deadline?: string | null;
  isCompleted: boolean;
  member: {
    id: string;
    name: string;
  };
}

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    targetAmount: 100,
    iconName: 'currency-dollar',
    color: 'blue',
    deadline: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    goalId: string;
    goalName: string;
  }>({ isOpen: false, goalId: '', goalName: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/financial/savings-goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async () => {
    if (!newGoal.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a goal name',
      });
      return;
    }

    if (newGoal.targetAmount <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Target amount must be greater than 0',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/financial/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          deadline: newGoal.deadline || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Savings goal created successfully!',
        });
        setNewGoal({
          name: '',
          description: '',
          targetAmount: 100,
          iconName: 'currency-dollar',
          color: 'blue',
          deadline: '',
        });
        setShowAddForm(false);
        await fetchGoals();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create savings goal',
        });
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create savings goal',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setNewGoal({
      name: '',
      description: '',
      targetAmount: 100,
      iconName: 'currency-dollar',
      color: 'blue',
      deadline: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteClick = (goalId: string, goalName: string) => {
    setConfirmModal({
      isOpen: true,
      goalId,
      goalName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { goalId } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const response = await fetch(`/api/financial/savings-goals/${goalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Savings goal deleted successfully',
        });
        await fetchGoals();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete savings goal',
        });
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete savings goal',
      });
    }
  };

  const getProgressPercentage = (goal: SavingsGoal) => {
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Savings Goals
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Set and track your savings goals
              </p>
            </div>
            <button
              onClick={() => {
                if (showAddForm) {
                  handleCancelEdit();
                } else {
                  setShowAddForm(true);
                }
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              {showAddForm ? '✕ Cancel' : '+ Add Goal'}
            </button>
          </div>
        </div>

        {/* Add Goal Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create Savings Goal
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="goal-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goal Name *
                </label>
                <input
                  id="goal-name"
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., New Bicycle, Video Game, Summer Camp"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="goal-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="goal-description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Describe your goal..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Amount (Credits) *
                  </label>
                  <input
                    id="target-amount"
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deadline (optional)
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddGoal}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                {adding ? 'Creating...' : 'Create Goal'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Goals Grid */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = getProgressPercentage(goal);
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {goal.name}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleDeleteClick(goal.id, goal.name)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete goal"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {goal.currentAmount}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        of {goal.targetAmount} credits
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`${getProgressColor(progress)} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {progress}% complete
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                  )}

                  {goal.isCompleted && (
                    <div className="mt-3 px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg text-sm font-medium text-center">
                      Goal Completed!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No savings goals yet.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create First Goal
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Savings Goal"
        message={`Delete "${confirmModal.goalName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
