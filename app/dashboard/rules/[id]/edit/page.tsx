'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

// Helper function to get readable label for trigger/action type
const getTypeLabel = (type: string, typesList: typeof TRIGGER_TYPES) => {
  return typesList.find(t => t.value === type)?.label || type;
};

// Helper function to format trigger details
const formatTriggerDetails = (trigger: any) => {
  if (!trigger) return null;
  
  const details: string[] = [];
  const config = trigger;
  
  // Format based on trigger type
  switch (trigger.type) {
    case 'chore_completed':
      if (config.choreId) details.push(`Chore ID: ${config.choreId}`);
      if (config.memberId) details.push(`Member ID: ${config.memberId}`);
      break;
    case 'chore_streak':
      if (config.streakDays) details.push(`Streak: ${config.streakDays} days`);
      break;
    case 'screentime_low':
      if (config.thresholdMinutes) details.push(`Threshold: ${config.thresholdMinutes} minutes`);
      break;
    case 'inventory_low':
      if (config.itemId) details.push(`Item ID: ${config.itemId}`);
      if (config.threshold) details.push(`Threshold: ${config.threshold}`);
      break;
    case 'time_based':
      if (config.schedule) details.push(`Schedule: ${config.schedule}`);
      if (config.time) details.push(`Time: ${config.time}`);
      break;
  }
  
  return details;
};

// Helper function to format action details
const formatActionDetails = (action: any) => {
  if (!action) return null;
  
  const details: string[] = [];
  
  switch (action.type) {
    case 'award_credits':
      if (action.amount) details.push(`Amount: ${action.amount} credits`);
      if (action.memberId) details.push(`Member ID: ${action.memberId}`);
      break;
    case 'send_notification':
      if (action.title) details.push(`Title: ${action.title}`);
      if (action.message) details.push(`Message: ${action.message}`);
      if (action.recipients) details.push(`Recipients: ${action.recipients.join(', ')}`);
      break;
    case 'add_shopping_item':
      if (action.itemName) details.push(`Item: ${action.itemName}`);
      if (action.category) details.push(`Category: ${action.category}`);
      break;
    case 'adjust_screentime':
      if (action.adjustmentMinutes) details.push(`Adjustment: ${action.adjustmentMinutes > 0 ? '+' : ''}${action.adjustmentMinutes} minutes`);
      break;
  }
  
  return details;
};

interface Rule {
  id: string;
  name: string;
  description?: string;
  trigger: any;
  conditions: any;
  actions: any;
  isEnabled: boolean;
}

export default function EditRulePage() {
  const router = useRouter();
  const params = useParams();
  const ruleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<Rule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<any>(null);
  const [actions, setActions] = useState<any>(null);
  const [conditions, setConditions] = useState<any>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchRule();
  }, [ruleId]);

  const fetchRule = async () => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`);
      if (response.ok) {
        const data = await response.json();
        const ruleData = data.rule;
        setRule(ruleData);
        setName(ruleData.name);
        setDescription(ruleData.description || '');
        setTrigger(ruleData.trigger);
        setActions(ruleData.actions);
        setConditions(ruleData.conditions);
        setIsActive(ruleData.is_enabled ?? true);
      } else {
        console.error('Failed to fetch rule');
        router.push('/dashboard/rules');
      }
    } catch (error) {
      console.error('Error fetching rule:', error);
      router.push('/dashboard/rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          is_enabled: isActive,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/rules');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      alert('Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading rule...</div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Rule not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/rules"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Rules
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Edit Rule
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Rule is active
              </label>
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Trigger
          </h2>

          {trigger && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {getTypeLabel(trigger.type, TRIGGER_TYPES)}
                </span>
              </div>

              {formatTriggerDetails(trigger)?.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-400">•</span>
                  <span>{detail}</span>
                </div>
              ))}

              <details className="mt-4">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  View raw configuration
                </summary>
                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(trigger, null, 2)}
                </pre>
              </details>

              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3 flex items-start gap-1">
                <span>⚠️</span>
                <span>Trigger configuration cannot be edited. Create a new rule to change the trigger.</span>
              </p>
            </div>
          )}
        </div>

        {/* Conditions */}
        {conditions && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Conditions (Optional)
            </h2>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This rule has additional conditions that must be met before actions are executed.
              </p>

              <details className="mt-4">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  View conditions configuration
                </summary>
                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(conditions, null, 2)}
                </pre>
              </details>

              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3 flex items-start gap-1">
                <span>⚠️</span>
                <span>Conditions cannot be edited. Create a new rule to change conditions.</span>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Actions
          </h2>

          {actions && Array.isArray(actions) && actions.length > 0 ? (
            <div className="space-y-4">
              {actions.map((action, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {getTypeLabel(action.type, ACTION_TYPES)}
                    </span>
                  </div>

                  {formatActionDetails(action)?.map((detail, detailIdx) => (
                    <div key={detailIdx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-gray-400">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}

                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                      View raw configuration
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded overflow-auto max-h-32">
                      {JSON.stringify(action, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}

              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3 flex items-start gap-1">
                <span>⚠️</span>
                <span>Actions cannot be edited. Create a new rule to change actions.</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No actions configured</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/dashboard/rules"
            className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
