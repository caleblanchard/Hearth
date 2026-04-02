'use client';

import { useState, useEffect } from 'react';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface GraceSettings {
  id?: string;
  memberId: string;
  gracePeriodMinutes: number;
  maxGracePerDay: number;
  maxGracePerWeek: number;
  graceRepaymentMode: 'DEDUCT_NEXT_WEEK' | 'EARN_BACK' | 'FORGIVE';
  lowBalanceWarningMinutes: number;
  requiresApproval: boolean;
}

interface GraceSettingsPanelProps {
  memberId: string;
  memberName: string;
  onSettingsSaved?: () => void;
}

const REPAYMENT_MODES = [
  {
    value: 'DEDUCT_NEXT_WEEK',
    label: 'Deduct Next Week',
    description: 'Borrowed time is subtracted from next week\'s allocation',
  },
  {
    value: 'EARN_BACK',
    label: 'Earn Back',
    description: 'Must complete extra chores to earn back borrowed time',
  },
  {
    value: 'FORGIVE',
    label: 'Forgive',
    description: 'Borrowed time is forgiven (no repayment required)',
  },
];

export default function GraceSettingsPanel({
  memberId,
  memberName,
  onSettingsSaved,
}: GraceSettingsPanelProps) {
  const [settings, setSettings] = useState<GraceSettings>({
    memberId,
    gracePeriodMinutes: 15,
    maxGracePerDay: 1,
    maxGracePerWeek: 3,
    graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
    lowBalanceWarningMinutes: 10,
    requiresApproval: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [memberId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(
        `/api/screentime/grace/settings?memberId=${memberId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch grace settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/screentime/grace/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Grace settings saved successfully!',
        });
        onSettingsSaved?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save settings',
        });
      }
    } catch (error) {
      console.error('Error saving grace settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-6 h-96" />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Grace Period Settings
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure "Finish the Round" settings for {memberName}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Grace Period Minutes */}
        <div>
          <label
            htmlFor="gracePeriodMinutes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Grace Period Duration
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="gracePeriodMinutes"
              min="5"
              max="30"
              value={settings.gracePeriodMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  gracePeriodMinutes: parseInt(e.target.value) || 15,
                })
              }
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              minutes (5-30 range)
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            How many extra minutes to grant when requested
          </p>
        </div>

        {/* Max Grace Per Day */}
        <div>
          <label
            htmlFor="maxGracePerDay"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Maximum Requests Per Day
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="maxGracePerDay"
              min="0"
              max="5"
              value={settings.maxGracePerDay}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxGracePerDay: parseInt(e.target.value) || 0,
                })
              }
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              requests (0-5 range)
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prevents abuse by limiting daily grace requests
          </p>
        </div>

        {/* Max Grace Per Week */}
        <div>
          <label
            htmlFor="maxGracePerWeek"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Maximum Requests Per Week
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="maxGracePerWeek"
              min="0"
              max="10"
              value={settings.maxGracePerWeek}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxGracePerWeek: parseInt(e.target.value) || 0,
                })
              }
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              requests (0-10 range)
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Weekly limit across all days
          </p>
        </div>

        {/* Low Balance Warning Threshold */}
        <div>
          <label
            htmlFor="lowBalanceWarningMinutes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Low Balance Warning Threshold
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="lowBalanceWarningMinutes"
              min="5"
              max="60"
              value={settings.lowBalanceWarningMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lowBalanceWarningMinutes: parseInt(e.target.value) || 10,
                })
              }
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              minutes (5-60 range)
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Show grace option when balance falls below this amount
          </p>
        </div>

        {/* Repayment Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Repayment Mode
          </label>
          <div className="space-y-3">
            {REPAYMENT_MODES.map((mode) => (
              <label
                key={mode.value}
                className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <input
                  type="radio"
                  name="repaymentMode"
                  value={mode.value}
                  checked={settings.graceRepaymentMode === mode.value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      graceRepaymentMode: e.target.value as any,
                    })
                  }
                  className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {mode.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {mode.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Requires Approval */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <input
            type="checkbox"
            id="requiresApproval"
            checked={settings.requiresApproval}
            onChange={(e) =>
              setSettings({
                ...settings,
                requiresApproval: e.target.checked,
              })
            }
            className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 rounded"
          />
          <label htmlFor="requiresApproval" className="flex-1 cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">
              Require Parent Approval
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              When enabled, grace requests must be approved by a parent before being
              granted
            </div>
          </label>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message.type === 'success' && (
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Grace Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
