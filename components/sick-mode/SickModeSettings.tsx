'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Settings {
  id: string;
  autoEnableOnTemperature: boolean;
  temperatureThreshold: number;
  autoDisableAfter24Hours: boolean;
  pauseChores: boolean;
  pauseScreenTimeTracking: boolean;
  screenTimeBonus: number;
  skipMorningRoutine: boolean;
  skipBedtimeRoutine: boolean;
  muteNonEssentialNotifs: boolean;
}

export default function SickModeSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/family/sick-mode/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/family/sick-mode/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8 text-gray-500">
        Failed to load settings. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sick Mode Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure how the system behaves when a family member is sick
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {/* Auto-Enable Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Auto-Trigger</h3>
          
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Auto-enable on fever
              </span>
              <p className="text-xs text-gray-500">
                Automatically start sick mode when temperature exceeds threshold
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoEnableOnTemperature}
              onChange={e => updateSetting('autoEnableOnTemperature', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature threshold (°F)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.temperatureThreshold}
              onChange={e => updateSetting('temperatureThreshold', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Auto-disable after 24 hours
              </span>
              <p className="text-xs text-gray-500">
                Automatically end sick mode after one day
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDisableAfter24Hours}
              onChange={e => updateSetting('autoDisableAfter24Hours', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Chores Section */}
        <div className="p-6">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Pause chore assignments
              </span>
              <p className="text-xs text-gray-500">
                Skip creating new chore instances while sick
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pauseChores}
              onChange={e => updateSetting('pauseChores', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Screen Time Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Screen Time</h3>
          
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Pause tracking
              </span>
              <p className="text-xs text-gray-500">
                Don't deduct from allowance while sick
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pauseScreenTimeTracking}
              onChange={e => updateSetting('pauseScreenTimeTracking', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bonus minutes
            </label>
            <input
              type="number"
              value={settings.screenTimeBonus}
              onChange={e => updateSetting('screenTimeBonus', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Extra screen time minutes granted while sick
            </p>
          </div>
        </div>

        {/* Routines Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Routines</h3>
          
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Skip morning routine
              </span>
              <p className="text-xs text-gray-500">
                Don't require morning checklist completion
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.skipMorningRoutine}
              onChange={e => updateSetting('skipMorningRoutine', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Skip bedtime routine
              </span>
              <p className="text-xs text-gray-500">
                Don't require bedtime checklist completion
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.skipBedtimeRoutine}
              onChange={e => updateSetting('skipBedtimeRoutine', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Notifications Section */}
        <div className="p-6">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Mute non-essential notifications
              </span>
              <p className="text-xs text-gray-500">
                Reduce notification noise while recovering
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.muteNonEssentialNotifs}
              onChange={e => updateSetting('muteNonEssentialNotifs', e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
