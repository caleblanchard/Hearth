'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TRIGGER_TYPES = [
  { value: 'chore_completed', label: 'Chore Completed' },
  { value: 'chore_streak', label: 'Chore Streak' },
  { value: 'screentime_low', label: 'Screen Time Low' },
  { value: 'inventory_low', label: 'Inventory Low' },
  { value: 'calendar_busy', label: 'Calendar Busy' },
  { value: 'medication_given', label: 'Medication Given' },
  { value: 'routine_completed', label: 'Routine Completed' },
  { value: 'time_based', label: 'Time Based' },
];

const ACTION_TYPES = [
  { value: 'award_credits', label: 'Award Credits' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'add_shopping_item', label: 'Add Shopping Item' },
  { value: 'create_todo', label: 'Create Todo' },
  { value: 'lock_medication', label: 'Lock Medication' },
  { value: 'suggest_meal', label: 'Suggest Meal' },
  { value: 'reduce_chores', label: 'Reduce Chores' },
  { value: 'adjust_screentime', label: 'Adjust Screen Time' },
];

export default function CreateRulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actions, setActions] = useState<Array<{ type: string; config: Record<string, any> }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAction = () => {
    setActions([...actions, { type: '', config: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: string) => {
    const newActions = [...actions];
    newActions[index] = { type, config: {} };
    setActions(newActions);
  };

  const handleActionConfigChange = (index: number, key: string, value: any) => {
    const newActions = [...actions];
    newActions[index].config[key] = value;
    setActions(newActions);
  };

  const handleTriggerConfigChange = (key: string, value: any) => {
    setTriggerConfig({ ...triggerConfig, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!triggerType) {
      setError('Trigger type is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    if (actions.some(a => !a.type)) {
      setError('All actions must have a type selected');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger: {
            type: triggerType,
            config: triggerConfig,
          },
          actions: actions.map(a => ({
            type: a.type,
            config: a.config,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create rule');
      }

      router.push('/dashboard/rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'chore_streak':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={triggerConfig.days || ''}
                onChange={(e) => handleTriggerConfigChange('days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 7"
              />
            </div>
          </div>
        );

      case 'screentime_low':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={triggerConfig.thresholdMinutes || ''}
                onChange={(e) => handleTriggerConfigChange('thresholdMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 30"
              />
            </div>
          </div>
        );

      case 'calendar_busy':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Count
              </label>
              <input
                type="number"
                min="1"
                value={triggerConfig.eventCount || ''}
                onChange={(e) => handleTriggerConfigChange('eventCount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3"
              />
            </div>
          </div>
        );

      case 'time_based':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cron Expression
              </label>
              <input
                type="text"
                value={triggerConfig.cron || ''}
                onChange={(e) => handleTriggerConfigChange('cron', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 0 9 * * 0 (Every Sunday at 9 AM)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: minute hour day month dayOfWeek
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={triggerConfig.description || ''}
                onChange={(e) => handleTriggerConfigChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Every Sunday at 9 AM"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Select a trigger type to configure
          </div>
        );
    }
  };

  const renderActionConfig = (action: { type: string; config: Record<string, any> }, index: number) => {
    switch (action.type) {
      case 'award_credits':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={action.config.amount || ''}
                onChange={(e) => handleActionConfigChange(index, 'amount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={action.config.reason || ''}
                onChange={(e) => handleActionConfigChange(index, 'reason', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Streak bonus"
              />
            </div>
          </div>
        );

      case 'send_notification':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={action.config.title || ''}
                onChange={(e) => handleActionConfigChange(index, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Alert"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={action.config.message || ''}
                onChange={(e) => handleActionConfigChange(index, 'message', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Important notification"
              />
            </div>
          </div>
        );

      case 'adjust_screentime':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (minutes, use negative to subtract)
              </label>
              <input
                type="number"
                min="-120"
                max="120"
                value={action.config.amountMinutes || ''}
                onChange={(e) => handleActionConfigChange(index, 'amountMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 30 or -15"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Select an action type to configure
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/rules" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Rules
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Automation Rule</h1>
          <p className="text-gray-600 mt-2">Define triggers and actions for automated household management</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Weekly Allowance"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="e.g., Award weekly allowance every Sunday"
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trigger</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="trigger-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Type *
                </label>
                <select
                  id="trigger-type"
                  value={triggerType}
                  onChange={(e) => {
                    setTriggerType(e.target.value);
                    setTriggerConfig({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Trigger Type"
                >
                  <option value="">Select a trigger...</option>
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {triggerType && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Trigger Configuration</h3>
                  {renderTriggerConfig()}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
              <button
                type="button"
                onClick={handleAddAction}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                disabled={actions.length >= 5}
              >
                Add Action
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No actions added yet. Click "Add Action" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Action {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={`action-type-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Action Type
                        </label>
                        <select
                          id={`action-type-${index}`}
                          value={action.type}
                          onChange={(e) => handleActionTypeChange(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Action Type"
                        >
                          <option value="">Select an action...</option>
                          {ACTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {action.type && (
                        <div className="border-t border-gray-200 pt-3">
                          {renderActionConfig(action, index)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/rules"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
