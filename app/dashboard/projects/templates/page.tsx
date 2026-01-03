'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  RectangleStackIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDays: number;
  suggestedBudget: number;
  tasks: {
    name: string;
    description: string;
    estimatedHours: number;
  }[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [customizations, setCustomizations] = useState({
    name: '',
    budget: '',
    startDate: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/projects/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setCreating(true);
      const res = await fetch('/api/projects/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customizations: {
            name: customizations.name || selectedTemplate.name,
            budget: customizations.budget ? parseFloat(customizations.budget) : undefined,
            startDate: customizations.startDate || undefined,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/projects/${data.project.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setCreating(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'event':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'home':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'travel':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'personal':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter((t) => t.category === categoryFilter);

  if (session?.user?.role !== 'PARENT') {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only parents can manage projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Projects
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <RectangleStackIcon className="h-8 w-8 text-ember-700 dark:text-ember-500" />
          Project Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Start with a pre-configured project template
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mt-6">
          {['all', 'event', 'home', 'travel', 'personal'].map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                categoryFilter === category
                  ? 'bg-ember-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 dark:border-ember-500 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{template.tasks.length} tasks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{template.estimatedDays} days</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>${template.suggestedBudget.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    {template.tasks.reduce((sum, t) => sum + t.estimatedHours, 0)} hours
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTemplate(template);
                  setCustomizations({
                    name: template.name,
                    budget: template.suggestedBudget.toString(),
                    startDate: new Date().toISOString().split('T')[0],
                  });
                }}
                className="w-full px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customization Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Customize: {selectedTemplate.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={customizations.name}
                    onChange={(e) =>
                      setCustomizations({ ...customizations, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={selectedTemplate.name}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget (optional)
                  </label>
                  <input
                    type="number"
                    value={customizations.budget}
                    onChange={(e) =>
                      setCustomizations({ ...customizations, budget: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={selectedTemplate.suggestedBudget.toString()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date (optional)
                  </label>
                  <input
                    type="date"
                    value={customizations.startDate}
                    onChange={(e) =>
                      setCustomizations({ ...customizations, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Included Tasks ({selectedTemplate.tasks.length})
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.tasks.slice(0, 5).map((task, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{task.name}</span>
                      </li>
                    ))}
                    {selectedTemplate.tasks.length > 5 && (
                      <li className="text-gray-500 dark:text-gray-500 italic">
                        ...and {selectedTemplate.tasks.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromTemplate}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
