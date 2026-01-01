'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  period: string;
  resetDay: number;
  isActive: boolean;
  member: {
    id: string;
    name: string;
  };
  periods: Array<{
    id: string;
    periodKey: string;
    spent: number;
  }>;
}

interface Member {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: 'REWARDS', label: 'Rewards' },
  { value: 'SCREEN_TIME', label: 'Screen Time' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  const [newBudget, setNewBudget] = useState({
    memberId: '',
    category: 'REWARDS',
    limitAmount: 50,
    period: 'monthly',
    resetDay: 0,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    budgetId: string;
    budgetName: string;
  }>({ isOpen: false, budgetId: '', budgetName: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/financial/budgets');
      if (response.ok) {
        const data = await response.json();
        setBudgets(data.budgets || []);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/children');
      if (response.ok) {
        const data = await response.json();
        setMembers(data || []);
        if (data && data.length > 0 && !newBudget.memberId) {
          setNewBudget({ ...newBudget, memberId: data[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchMembers();
  }, []);

  const handleAddBudget = async () => {
    if (!newBudget.memberId) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select a family member',
      });
      return;
    }

    if (newBudget.limitAmount <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Budget limit must be greater than 0',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/financial/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Budget created successfully!',
        });
        setNewBudget({
          memberId: members[0]?.id || '',
          category: 'REWARDS',
          limitAmount: 50,
          period: 'monthly',
          resetDay: 0,
        });
        setShowAddForm(false);
        await fetchBudgets();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create budget',
        });
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create budget',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setNewBudget({
      memberId: members[0]?.id || '',
      category: 'REWARDS',
      limitAmount: 50,
      period: 'monthly',
      resetDay: 0,
    });
    setShowAddForm(false);
  };

  const handleDeleteClick = (budgetId: string, budgetName: string) => {
    setConfirmModal({
      isOpen: true,
      budgetId,
      budgetName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { budgetId } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const response = await fetch(`/api/financial/budgets/${budgetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Budget deleted successfully',
        });
        await fetchBudgets();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete budget',
        });
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete budget',
      });
    }
  };

  const getUsagePercentage = (budget: Budget) => {
    const currentPeriod = budget.periods[0];
    if (!currentPeriod) return 0;
    return Math.round((currentPeriod.spent / budget.limitAmount) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 dark:text-red-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
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
                Budget Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Set spending limits and track budget usage
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
              {showAddForm ? '✕ Cancel' : '+ Add Budget'}
            </button>
          </div>
        </div>

        {/* Add Budget Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create Budget
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="member-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family Member *
                </label>
                <select
                  id="member-select"
                  value={newBudget.memberId}
                  onChange={(e) => setNewBudget({ ...newBudget, memberId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    id="category-select"
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="limit-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Limit Amount (Credits) *
                  </label>
                  <input
                    id="limit-amount"
                    type="number"
                    value={newBudget.limitAmount}
                    onChange={(e) => setNewBudget({ ...newBudget, limitAmount: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period *
                  </label>
                  <select
                    id="period-select"
                    value={newBudget.period}
                    onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newBudget.period === 'weekly' && (
                <div>
                  <label htmlFor="reset-day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reset Day (for weekly budgets)
                  </label>
                  <select
                    id="reset-day"
                    value={newBudget.resetDay}
                    onChange={(e) => setNewBudget({ ...newBudget, resetDay: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddBudget}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                {adding ? 'Creating...' : 'Create Budget'}
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

        {/* Budgets List */}
        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const usage = getUsagePercentage(budget);
              const currentPeriod = budget.periods[0];

              return (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {budget.member.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                          {budget.category}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {budget.period}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-2xl font-bold ${getUsageColor(usage)}`}>
                            {currentPeriod?.spent || 0}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            of {budget.limitAmount} credits
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`${getProgressColor(usage)} h-3 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(100, usage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-sm font-medium ${getUsageColor(usage)}`}>
                            {usage}% used
                          </span>
                          {usage >= 80 && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              {usage >= 100 ? 'Budget exceeded!' : 'Approaching limit'}
                            </span>
                          )}
                        </div>
                      </div>

                      {currentPeriod && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Current period: {currentPeriod.periodKey}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => handleDeleteClick(budget.id, `${budget.member.name} - ${budget.category}`)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete budget"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No budgets configured yet.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create First Budget
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Budget"
        message={`Delete budget for "${confirmModal.budgetName}"? This cannot be undone.`}
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
