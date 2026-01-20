'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KioskSettings {
  isEnabled: boolean;
  autoLockMinutes: number;
  enabledWidgets: string[];
  allowGuestView: boolean;
  requirePinForSwitch: boolean;
}

const AVAILABLE_WIDGETS = [
  { id: 'transport', name: 'Transport', description: 'Daily transport schedules' },
  { id: 'medication', name: 'Medications', description: 'Upcoming and overdue doses' },
  { id: 'maintenance', name: 'Maintenance', description: 'Home maintenance tasks' },
  { id: 'inventory', name: 'Inventory', description: 'Low stock items' },
  { id: 'weather', name: 'Weather', description: 'Current weather and forecast' },
];

export default function KioskSettingsForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<KioskSettings>({
    isEnabled: true,
    autoLockMinutes: 15,
    enabledWidgets: ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
    allowGuestView: true,
    requirePinForSwitch: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/kiosk/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/kiosk/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function toggleWidget(widgetId: string) {
    setSettings((prev) => ({
      ...prev,
      enabledWidgets: prev.enabledWidgets.includes(widgetId)
        ? prev.enabledWidgets.filter((w) => w !== widgetId)
        : [...prev.enabledWidgets, widgetId],
    }));
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          General Settings
        </h2>

        <div className="space-y-4">
          {/* Enable Kiosk Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Kiosk Mode
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow kiosk mode access for your family
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.isEnabled ? 'bg-ember-700' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto-lock Timeout */}
          <div>
            <label
              htmlFor="autoLockMinutes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Auto-lock Timeout (minutes)
            </label>
            <input
              type="number"
              id="autoLockMinutes"
              min="1"
              max="120"
              value={settings.autoLockMinutes}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  autoLockMinutes: parseInt(e.target.value) || 15,
                }))
              }
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kiosk will auto-lock after this period of inactivity
            </p>
          </div>

          {/* Allow Guest View */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow Guest View
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Show family-wide information when locked
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({ ...prev, allowGuestView: !prev.allowGuestView }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowGuestView ? 'bg-ember-700' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowGuestView ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Require PIN for Member Switch */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Require PIN for Member Switch
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Members must enter PIN to view personalized data
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  requirePinForSwitch: !prev.requirePinForSwitch,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requirePinForSwitch
                  ? 'bg-ember-700'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requirePinForSwitch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Enabled Widgets */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Enabled Widgets
        </h2>

        <div className="space-y-3">
          {AVAILABLE_WIDGETS.map((widget) => (
            <div
              key={widget.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={widget.id}
                  checked={settings.enabledWidgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                  className="h-4 w-4 text-ember-700 focus:ring-ember-500 border-gray-300 rounded"
                />
                <div>
                  <label
                    htmlFor={widget.id}
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    {widget.name}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {widget.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          Settings saved successfully!
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
