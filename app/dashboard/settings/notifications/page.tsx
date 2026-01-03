'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationPreferences {
  enabledTypes: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  leftoverExpiringHours: number;
  documentExpiringDays: number;
  carpoolReminderMinutes: number;
}

const NOTIFICATION_TYPES = [
  { value: 'CHORE_COMPLETED', label: 'Chore Completed', description: 'When a child completes a chore' },
  { value: 'CHORE_APPROVED', label: 'Chore Approved', description: 'When your chore is approved' },
  { value: 'REWARD_APPROVED', label: 'Reward Approved', description: 'When a reward redemption is approved' },
  { value: 'LEFTOVER_EXPIRING', label: 'Leftover Expiring', description: 'When leftovers are about to expire' },
  { value: 'DOCUMENT_EXPIRING', label: 'Document Expiring', description: 'When documents are about to expire' },
  { value: 'MEDICATION_AVAILABLE', label: 'Medication Available', description: 'When medication cooldown completes' },
  { value: 'ROUTINE_TIME', label: 'Routine Time', description: 'When it\'s time to start a routine' },
  { value: 'MAINTENANCE_DUE', label: 'Maintenance Due', description: 'When maintenance tasks are due' },
  { value: 'PET_CARE_REMINDER', label: 'Pet Care Reminder', description: 'When pets need care' },
  { value: 'CARPOOL_REMINDER', label: 'Carpool Reminder', description: 'Before carpool pickup/dropoff' },
  { value: 'SAVINGS_GOAL_ACHIEVED', label: 'Savings Goal Achieved', description: 'When a savings goal is reached' },
  { value: 'BUSY_DAY_ALERT', label: 'Busy Day Alert', description: 'Morning notification about busy days' },
  { value: 'RULE_TRIGGERED', label: 'Automation Rule Triggered', description: 'When automation rules execute' },
];

export default function NotificationSettingsPage() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabledTypes: [],
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    pushEnabled: true,
    inAppEnabled: true,
    leftoverExpiringHours: 24,
    documentExpiringDays: 90,
    carpoolReminderMinutes: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);

    // Load preferences
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (response.ok) {
        setPushSubscribed(true);
        setMessage({ type: 'success', text: 'Push notifications enabled!' });
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      setMessage({ type: 'error', text: 'Failed to enable push notifications' });
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setPushSubscribed(false);
        setMessage({ type: 'success', text: 'Push notifications disabled' });
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
    }
  };

  const toggleNotificationType = (type: string) => {
    setPreferences((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter((t) => t !== type)
        : [...prev.enabledTypes, type],
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ember-600"></div>
      </div>
    );
  }

  if (!session) {
    return <div className="p-4">Please sign in to manage notification settings.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Push Notifications */}
      {pushSupported && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
          <p className="text-gray-600 mb-4">
            Enable push notifications to receive alerts even when Hearth is not open.
          </p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.pushEnabled}
              onChange={(e) => {
                setPreferences({ ...preferences, pushEnabled: e.target.checked });
                if (e.target.checked && !pushSubscribed) {
                  subscribeToPush();
                } else if (!e.target.checked && pushSubscribed) {
                  unsubscribeFromPush();
                }
              }}
              className="w-5 h-5 text-ember-600 rounded focus:ring-ember-500"
            />
            <span className="font-medium">Enable Push Notifications</span>
          </label>
        </div>
      )}

      {/* In-App Notifications */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">In-App Notifications</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.inAppEnabled}
            onChange={(e) =>
              setPreferences({ ...preferences, inAppEnabled: e.target.checked })
            }
            className="w-5 h-5 text-ember-600 rounded focus:ring-ember-500"
          />
          <span className="font-medium">Show notifications in the app</span>
        </label>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quiet Hours</h2>
        <p className="text-gray-600 mb-4">
          Prevent notifications during specific hours (e.g., bedtime).
        </p>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={preferences.quietHoursEnabled}
            onChange={(e) =>
              setPreferences({ ...preferences, quietHoursEnabled: e.target.checked })
            }
            className="w-5 h-5 text-ember-600 rounded focus:ring-ember-500"
          />
          <span className="font-medium">Enable Quiet Hours</span>
        </label>
        {preferences.quietHoursEnabled && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.quietHoursStart || '22:00'}
                onChange={(e) =>
                  setPreferences({ ...preferences, quietHoursStart: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={preferences.quietHoursEnd || '07:00'}
                onChange={(e) =>
                  setPreferences({ ...preferences, quietHoursEnd: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notification Types */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
        <p className="text-gray-600 mb-4">
          Choose which notifications you want to receive.
        </p>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((type) => (
            <label key={type.value} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabledTypes.includes(type.value)}
                onChange={() => toggleNotificationType(type.value)}
                className="w-5 h-5 text-ember-600 rounded focus:ring-ember-500 mt-0.5"
              />
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Timing Preferences */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Timing Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leftover Expiring (hours before)
            </label>
            <input
              type="number"
              min="1"
              value={preferences.leftoverExpiringHours}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  leftoverExpiringHours: parseInt(e.target.value) || 24,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Expiring (days before)
            </label>
            <input
              type="number"
              min="1"
              value={preferences.documentExpiringDays}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  documentExpiringDays: parseInt(e.target.value) || 90,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carpool Reminder (minutes before)
            </label>
            <input
              type="number"
              min="5"
              value={preferences.carpoolReminderMinutes}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  carpoolReminderMinutes: parseInt(e.target.value) || 30,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="bg-ember-600 hover:bg-ember-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
