'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface RuleExecution {
  id: string;
  success: boolean;
  result: any;
  error: string | null;
  metadata: any;
  executedAt: string;
}

interface Rule {
  id: string;
  name: string;
  isEnabled: boolean;
}

export default function ExecutionHistoryPage() {
  const params = useParams();
  const ruleId = params.id as string;

  const [rule, setRule] = useState<Rule | null>(null);
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (ruleId) {
      fetchRule();
      fetchExecutions();
    }
  }, [ruleId, filter, offset]);

  const fetchRule = async () => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch rule');
      }

      const data = await response.json();
      setRule(data.rule);
    } catch (err) {
      console.error('Error fetching rule:', err);
    }
  };

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        ruleId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filter !== 'all') {
        params.append('success', filter === 'success' ? 'true' : 'false');
      }

      const response = await fetch(`/api/rules/executions?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch execution history');
      }

      const data = await response.json();
      setExecutions(data.executions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(date);
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  if (loading && executions.length === 0) {
    return (
      <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto mb-4"></div>
            <div className="text-slate-600 dark:text-slate-400">Loading execution history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/rules" className="text-ember-700 dark:text-ember-400 hover:text-ember-500 dark:hover:text-ember-300 text-sm mb-2 inline-block">
            ← Back to Rules
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Execution History</h1>
              {rule && (
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  {rule.name}
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rule.isEnabled ? 'bg-success/20 text-success dark:bg-success/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}>
                    {rule.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{total}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Executions</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-2xl font-bold text-success">
              {executions.filter(e => e.success).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Successful</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-2xl font-bold text-error">
              {executions.filter(e => !e.success).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Failed</div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFilter('all'); setOffset(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-ember-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setFilter('success'); setOffset(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'success'
                  ? 'bg-success text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
              }`}
            >
              Successful
            </button>
            <button
              onClick={() => { setFilter('failed'); setOffset(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'failed'
                  ? 'bg-error text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Timeline */}
        {executions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No executions found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {filter !== 'all'
                ? `This rule has no ${filter} executions yet.`
                : 'This rule has not been executed yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution, idx) => (
              <div
                key={execution.id}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border-2 p-6 ${
                  execution.success
                    ? 'border-success/30 hover:border-success/50 dark:border-success/50'
                    : 'border-error/30 hover:border-error/50 dark:border-error/50'
                } transition-colors`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      execution.success ? 'bg-success/20 dark:bg-success/30' : 'bg-error/20 dark:bg-error/30'
                    }`}>
                      {execution.success ? (
                        <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {execution.success ? 'Executed Successfully' : 'Execution Failed'}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {getRelativeTime(execution.executedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(execution.executedAt)}
                  </div>
                </div>

                {/* Result */}
                {execution.result && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Result</div>
                    <div className="bg-canvas-100 dark:bg-slate-700 rounded-lg p-3 text-sm">
                      {execution.result.actionsCompleted !== undefined && (
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">Actions Completed:</span>{' '}
                          {execution.result.actionsCompleted}
                          {execution.result.actionsFailed > 0 && (
                            <span className="text-error ml-2">
                              ({execution.result.actionsFailed} failed)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {execution.error && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-error mb-1">Error</div>
                    <div className="bg-error/10 dark:bg-error/20 rounded-lg p-3 text-sm text-error">
                      {execution.error}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {execution.metadata && Object.keys(execution.metadata).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      View Metadata
                    </summary>
                    <div className="mt-2 bg-canvas-100 dark:bg-slate-700 rounded-lg p-3">
                      <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                        {JSON.stringify(execution.metadata, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="text-sm text-gray-600">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
            </div>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
