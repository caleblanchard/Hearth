'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Module {
  moduleId: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  enabledAt: string | null;
  disabledAt: string | null;
  updatedAt: string | null;
}

export default function ModuleSettingsPage() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  // Fetch module configurations
  useEffect(() => {
    async function fetchModules() {
      try {
        const res = await fetch('/api/settings/modules');
        if (res.ok) {
          const data = await res.json();
          setModules(data.modules || []);
          setCategories(data.categories || {});
        } else if (res.status === 403) {
          alert('Only parents can access module settings');
        }
      } catch (error) {
        console.error('Error fetching module configurations:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.role === 'PARENT') {
      fetchModules();
    } else {
      setLoading(false);
    }
  }, [session]);

  const toggleModule = async (moduleId: string, currentlyEnabled: boolean) => {
    setUpdating((prev) => new Set(prev).add(moduleId));

    try {
      const res = await fetch('/api/settings/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          isEnabled: !currentlyEnabled,
        }),
      });

      if (res.ok) {
        // Update local state
        setModules((prevModules) =>
          prevModules.map((module) =>
            module.moduleId === moduleId
              ? { ...module, isEnabled: !currentlyEnabled }
              : module
          )
        );

        // Update categories
        setCategories((prevCategories) => {
          const newCategories = { ...prevCategories };
          Object.keys(newCategories).forEach((category) => {
            newCategories[category] = newCategories[category].map((module) =>
              module.moduleId === moduleId
                ? { ...module, isEnabled: !currentlyEnabled }
                : module
            );
          });
          return newCategories;
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update module');
      }
    } catch (error) {
      console.error('Error updating module:', error);
      alert('Failed to update module');
    } finally {
      setUpdating((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  if (session?.user?.role !== 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Access Restricted
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            Only parents can access module settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const categoryOrder = ['Tasks', 'Planning', 'Management', 'Rewards', 'Financial', 'Health', 'Communication'];
  const sortedCategories = Object.keys(categories).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8" />
          Module Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enable or disable modules for your family. Disabled modules will be hidden from the sidebar
          and inaccessible to all family members.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600 dark:text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Disabling a module hides it from all family members</li>
              <li>Your data is preserved - re-enabling a module restores access</li>
              <li>Core modules (Dashboard, Profile, Family) cannot be disabled</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modules by Category */}
      <div className="space-y-8">
        {sortedCategories.map((category) => (
          <div key={category}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories[category].map((module) => {
                const isUpdating = updating.has(module.moduleId);
                return (
                  <div
                    key={module.moduleId}
                    className={`p-6 bg-white dark:bg-gray-800 rounded-lg border-2 transition-all ${
                      module.isEnabled
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {module.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {module.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {module.isEnabled ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {module.isEnabled ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Enabled
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-500">
                            Disabled
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          toggleModule(module.moduleId, module.isEnabled)
                        }
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                          module.isEnabled
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {isUpdating ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            Updating...
                          </span>
                        ) : module.isEnabled ? (
                          'Disable'
                        ) : (
                          'Enable'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {modules.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Modules
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {modules.filter((m) => m.isEnabled).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Enabled
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {modules.filter((m) => !m.isEnabled).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Disabled
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Object.keys(categories).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Categories
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
