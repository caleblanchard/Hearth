'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      alert(err instanceof Error ? err.message : 'Failed to toggle rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Remove from local state
      setRules(rules.filter(rule => rule.id !== ruleId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rule');
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-600">Loading rules...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Automation Rules</h1>
          <p className="text-gray-600">Create and manage automated household rules</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setFilter('enabled')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'enabled'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Enabled ({rules.filter(r => r.isEnabled).length})
              </button>
              <button
                onClick={() => setFilter('disabled')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'disabled'
                    ? 'bg-gray-200 text-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Disabled ({rules.filter(r => !r.isEnabled).length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/rules/templates"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Browse Templates
              </Link>
              <Link
                href="/dashboard/rules/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Create Rule
              </Link>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        {filteredRules.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rules found</h3>
            <p className="text-gray-600 mb-6">
              {filter !== 'all'
                ? `You don't have any ${filter} rules yet.`
                : 'Get started by creating your first automation rule or browsing templates.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard/rules/templates"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Browse Templates
              </Link>
              <Link
                href="/dashboard/rules/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Create Rule
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-gray-500 mt-1">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getTriggerLabel(rule.trigger)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {getActionCount(rule.actions)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/rules/${rule.id}/history`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {rule._count?.executions || 0}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRule(rule.id, rule.isEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.isEnabled ? 'bg-green-600' : 'bg-gray-200'
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
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-600 hover:text-red-900"
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
    </div>
  );
}
