'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertModal, ConfirmModal } from '@/components/ui/Modal';

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger: any;
  actions: any;
  isEnabled: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
  _count?: {
    executions: number;
  };
}

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [error, setError] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    ruleId: string | null;
  }>({
    isOpen: false,
    ruleId: null,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/rules');

      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule');
      }

      // Update local state
      setRules(rules.map(rule =>
        rule.id === ruleId ? { ...rule, isEnabled: !currentState } : rule
      ));
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to toggle rule',
        type: 'error',
      });
    }
  };

  const handleDeleteClick = (ruleId: string) => {
    setDeleteConfirmModal({ isOpen: true, ruleId });
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Remove from local state
      setRules(rules.filter(rule => rule.id !== ruleId));
      setDeleteConfirmModal({ isOpen: false, ruleId: null });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete rule',
        type: 'error',
      });
      setDeleteConfirmModal({ isOpen: false, ruleId: null });
    }
  };

  const filteredRules = rules.filter(rule => {
    if (filter === 'enabled') return rule.isEnabled;
    if (filter === 'disabled') return !rule.isEnabled;
    return true;
  });

  const getTriggerLabel = (trigger: any): string => {
    const labels: Record<string, string> = {
      chore_completed: 'Chore Completed',
      chore_streak: 'Chore Streak',
      screentime_low: 'Screen Time Low',
      inventory_low: 'Inventory Low',
      calendar_busy: 'Calendar Busy',
      medication_given: 'Medication Given',
      routine_completed: 'Routine Completed',
      time_based: 'Time Based',
    };
    return labels[trigger?.type] || 'Unknown';
  };

  const getActionCount = (actions: any[]): string => {
    const count = actions?.length || 0;
    return `${count} action${count !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto mb-4"></div>
            <div className="text-slate-600 dark:text-slate-400">Loading rules...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Automation Rules</h1>
          <p className="text-slate-600 dark:text-slate-400">Create and manage automated household rules</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-ember-700 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setFilter('enabled')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'enabled'
                    ? 'bg-success/20 text-success dark:bg-success/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
                }`}
              >
                Enabled ({rules.filter(r => r.isEnabled).length})
              </button>
              <button
                onClick={() => setFilter('disabled')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'disabled'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
                }`}
              >
                Disabled ({rules.filter(r => !r.isEnabled).length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/rules/templates"
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700 transition-colors"
              >
                Browse Templates
              </Link>
              <Link
                href="/dashboard/rules/create"
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                Create Rule
              </Link>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        {filteredRules.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No rules found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {filter !== 'all'
                ? `You don't have any ${filter} rules yet.`
                : 'Get started by creating your first automation rule or browsing templates.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard/rules/templates"
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700 transition-colors"
              >
                Browse Templates
              </Link>
              <Link
                href="/dashboard/rules/create"
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                Create Rule
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-canvas-100 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ember-300 dark:bg-ember-700 text-ember-700 dark:text-ember-300">
                        {getTriggerLabel(rule.trigger)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {getActionCount(rule.actions)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/rules/${rule.id}/history`}
                        className="text-sm text-ember-700 dark:text-ember-400 hover:text-ember-500 dark:hover:text-ember-300"
                      >
                        {rule._count?.executions || 0}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRule(rule.id, rule.isEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.isEnabled ? 'bg-success' : 'bg-slate-200 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                      <Link
                        href={`/dashboard/rules/${rule.id}/edit`}
                        className="text-ember-700 dark:text-ember-400 hover:text-ember-500 dark:hover:text-ember-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(rule.id)}
                        className="text-error hover:text-error/80"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, ruleId: null })}
        onConfirm={() => deleteConfirmModal.ruleId && deleteRule(deleteConfirmModal.ruleId)}
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}
