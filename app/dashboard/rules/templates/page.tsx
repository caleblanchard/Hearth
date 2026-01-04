'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'safety' | 'rewards' | 'convenience';
  trigger: any;
  conditions?: any;
  actions: any[];
  customizable: string[];
}

const CATEGORY_LABELS = {
  productivity: 'Productivity',
  safety: 'Safety',
  rewards: 'Rewards',
  convenience: 'Convenience',
};

const CATEGORY_COLORS = {
  productivity: 'bg-info/20 text-info',
  safety: 'bg-red-100 text-red-800',
  rewards: 'bg-green-100 text-green-800',
  convenience: 'bg-ember-300 text-ember-700',
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = categoryFilter
        ? `/api/rules/templates?category=${categoryFilter}`
        : '/api/rules/templates';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = async (template: RuleTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      // For now, redirect to create page - could be enhanced with pre-filled form
      router.push('/dashboard/rules/create');
    } catch (err) {
      alert('Failed to use template');
    }
  };

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

  const getActionLabel = (action: any): string => {
    const labels: Record<string, string> = {
      award_credits: 'Award Credits',
      send_notification: 'Send Notification',
      add_shopping_item: 'Add Shopping Item',
      create_todo: 'Create Todo',
      lock_medication: 'Lock Medication',
      suggest_meal: 'Suggest Meal',
      reduce_chores: 'Reduce Chores',
      adjust_screentime: 'Adjust Screen Time',
    };
    return labels[action?.type] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto mb-4"></div>
            <div className="text-slate-600 dark:text-slate-400">Loading templates...</div>
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
          <Link href="/dashboard/rules" className="text-ember-700 hover:text-ember-500 text-sm mb-2 inline-block">
            ← Back to Rules
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rule Templates</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Choose from pre-built automation templates</p>
        </div>

        {/* Category Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === null
                  ? 'bg-ember-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  categoryFilter === key
                    ? 'bg-ember-700 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-canvas-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No templates found</h3>
            <p className="text-slate-600 dark:text-slate-400">Try selecting a different category or create a custom rule.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Template Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[template.category]}`}>
                      {CATEGORY_LABELS[template.category]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{template.description}</p>
                </div>

                {/* Template Details */}
                <div className="space-y-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Trigger</div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ember-300 dark:bg-ember-700 text-ember-700 dark:text-ember-300">
                      {getTriggerLabel(template.trigger)}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Actions ({template.actions.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.actions.map((action, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/20 dark:bg-info/30 text-info"
                        >
                          {getActionLabel(action)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {template.customizable.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Customizable</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {template.customizable.length} field{template.customizable.length !== 1 ? 's' : ''} can be customized
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectTemplate(template)}
                    className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Template Details Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                    <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedTemplate.category]}`}>
                      {CATEGORY_LABELS[selectedTemplate.category]}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-6">{selectedTemplate.description}</p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Trigger</h3>
                    <div className="bg-canvas-100 dark:bg-slate-700 rounded-lg p-3">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Type:</span> {getTriggerLabel(selectedTemplate.trigger)}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {JSON.stringify(selectedTemplate.trigger.config, null, 2)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Actions</h3>
                    <div className="space-y-2">
                      {selectedTemplate.actions.map((action, idx) => (
                        <div key={idx} className="bg-canvas-100 dark:bg-slate-700 rounded-lg p-3">
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Type:</span> {getActionLabel(action)}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {JSON.stringify(action.config, null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedTemplate.conditions && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Conditions</h3>
                      <div className="bg-canvas-100 dark:bg-slate-700 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
                        {JSON.stringify(selectedTemplate.conditions, null, 2)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCreateFromTemplate}
                    className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-md transition-colors"
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
