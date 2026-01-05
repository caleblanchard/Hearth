'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/Modal';

interface CalendarConnection {
  id: string;
  provider: string;
  googleEmail?: string;
  syncStatus: string;
  lastSyncAt?: string;
  syncEnabled: boolean;
  importFromGoogle: boolean;
  exportToGoogle: boolean;
  syncError?: string | null;
}

interface ExternalCalendarSubscription {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  color: string;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  nextSyncAt?: string | null;
  syncStatus: string;
  syncError?: string | null;
  isActive: boolean;
  refreshInterval: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export default function CalendarSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [subscriptions, setSubscriptions] = useState<ExternalCalendarSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<ExternalCalendarSubscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    url: '',
    description: '',
    color: '#9CA3AF',
    refreshInterval: 1440,
  });
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [syncingSubscription, setSyncingSubscription] = useState<string | null>(null);
  const [disconnectConfirmModal, setDisconnectConfirmModal] = useState<{
    isOpen: boolean;
    connectionId: string | null;
  }>({
    isOpen: false,
    connectionId: null,
  });
  const [deleteSubscriptionConfirmModal, setDeleteSubscriptionConfirmModal] = useState<{
    isOpen: boolean;
    subscriptionId: string | null;
  }>({
    isOpen: false,
    subscriptionId: null,
  });

  // Fetch connections
  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/calendar/connections');
      const data = await response.json();

      if (response.ok) {
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/calendar/subscriptions');
      const data = await response.json();

      if (response.ok) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for OAuth callback messages
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
      router.replace('/dashboard/settings/calendars');
      fetchConnections();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_state: 'Invalid request - please try again',
        missing_code: 'Authorization failed - please try again',
        invalid_state: 'Security validation failed - please try again',
        token_exchange_failed: 'Failed to connect to Google Calendar',
        email_fetch_failed: 'Connected but could not get account info',
        member_not_found: 'User profile not found',
        unknown: 'An unexpected error occurred',
      };
      setMessage({
        type: 'error',
        text: errorMessages[error] || 'Connection failed - please try again',
      });
      router.replace('/dashboard/settings/calendars');
    } else {
      fetchConnections();
      fetchSubscriptions();
    }
  }, [searchParams, router]);

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const response = await fetch('/api/calendar/google/connect');
      const data = await response.json();

      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Failed to start connection process' });
        setConnecting(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to Google Calendar' });
      setConnecting(false);
    }
  };

  const handleToggleSync = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: enabled ? 'Sync enabled' : 'Sync paused' });
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: 'Failed to update sync settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update sync settings' });
    }
  };

  const handleToggleImport = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importFromGoogle: enabled }),
      });

      if (response.ok) {
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: 'Failed to update import settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update import settings' });
    }
  };

  const handleToggleExport = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportToGoogle: enabled }),
      });

      if (response.ok) {
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: 'Failed to update export settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update export settings' });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setDisconnectConfirmModal({ isOpen: true, connectionId });
  };

  const confirmDisconnect = async () => {
    if (!disconnectConfirmModal.connectionId) return;
    const connectionId = disconnectConfirmModal.connectionId;

    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Calendar disconnected successfully' });
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
    } finally {
      setDisconnectConfirmModal({ isOpen: false, connectionId: null });
    }
  };

  const getStatusBadge = (connection: CalendarConnection) => {
    if (!connection.syncEnabled) {
      return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Paused</span>;
    }

    if (connection.syncStatus === 'ACTIVE') {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>;
    }

    if (connection.syncStatus === 'ERROR') {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Error</span>;
    }

    return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">{connection.syncStatus}</span>;
  };

  const formatLastSync = (lastSyncAt?: string | null) => {
    if (!lastSyncAt) return 'Never';

    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const handleAddSubscription = async () => {
    if (!subscriptionForm.name || !subscriptionForm.url) {
      setMessage({ type: 'error', text: 'Name and URL are required' });
      return;
    }

    try {
      setValidatingUrl(true);
      const response = await fetch('/api/calendar/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionForm),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Calendar subscription added successfully!' });
        setShowAddSubscription(false);
        setSubscriptionForm({
          name: '',
          url: '',
          description: '',
          color: '#9CA3AF',
          refreshInterval: 1440,
        });
        fetchSubscriptions();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add subscription' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add subscription' });
    } finally {
      setValidatingUrl(false);
    }
  };

  const handleUpdateSubscription = async (subscriptionId: string, updates: Partial<ExternalCalendarSubscription>) => {
    try {
      const response = await fetch(`/api/calendar/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription updated successfully' });
        setEditingSubscription(null);
        fetchSubscriptions();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update subscription' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update subscription' });
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    setDeleteSubscriptionConfirmModal({ isOpen: true, subscriptionId });
  };

  const confirmDeleteSubscription = async () => {
    if (!deleteSubscriptionConfirmModal.subscriptionId) return;
    const subscriptionId = deleteSubscriptionConfirmModal.subscriptionId;

    try {
      const response = await fetch(`/api/calendar/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription deleted successfully' });
        fetchSubscriptions();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete subscription' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete subscription' });
    }
  };

  const handleSyncSubscription = async (subscriptionId: string) => {
    try {
      setSyncingSubscription(subscriptionId);
      const response = await fetch(`/api/calendar/subscriptions/${subscriptionId}/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Sync completed: ${data.eventsCreated} created, ${data.eventsUpdated} updated, ${data.eventsDeleted} deleted`,
        });
        fetchSubscriptions();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync subscription' });
    } finally {
      setSyncingSubscription(null);
    }
  };

  const getSubscriptionStatusBadge = (subscription: ExternalCalendarSubscription) => {
    if (!subscription.isActive) {
      return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Inactive</span>;
    }

    if (subscription.syncStatus === 'ACTIVE') {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>;
    }

    if (subscription.syncStatus === 'ERROR') {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Error</span>;
    }

    return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">{subscription.syncStatus}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Calendar Settings</h1>

      {/* Success/Error Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <p>{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Google Calendar Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Google Calendar</h2>
        <p className="text-gray-600 mb-4">
          Connect your Google Calendar to automatically sync events between your calendars.
        </p>

        <button
          onClick={handleConnectGoogle}
          disabled={connecting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mb-6"
        >
          {connecting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Connect Google Calendar</span>
            </>
          )}
        </button>

        {/* Connected Calendars List */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium mb-4">Connected Calendars</h3>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : connections.length === 0 ? (
            <p className="text-gray-500 text-sm">No calendars connected yet.</p>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{connection.googleEmail}</span>
                        {getStatusBadge(connection)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Last synced: {formatLastSync(connection.lastSyncAt)}
                      </div>
                      {connection.syncError && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {connection.syncError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Sync Enable/Disable */}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={connection.syncEnabled}
                        onChange={(e) => handleToggleSync(connection.id, e.target.checked)}
                        className="rounded"
                      />
                      <span>Enable sync</span>
                    </label>

                    {/* Import from Google */}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={connection.importFromGoogle}
                        onChange={(e) => handleToggleImport(connection.id, e.target.checked)}
                        disabled={!connection.syncEnabled}
                        className="rounded disabled:opacity-50"
                      />
                      <span className={!connection.syncEnabled ? 'text-gray-400' : ''}>
                        Import events from Google Calendar
                      </span>
                    </label>

                    {/* Export to Google */}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={connection.exportToGoogle}
                        onChange={(e) => handleToggleExport(connection.id, e.target.checked)}
                        disabled={!connection.syncEnabled}
                        className="rounded disabled:opacity-50"
                      />
                      <span className={!connection.syncEnabled ? 'text-gray-400' : ''}>
                        Export events to Google Calendar
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Disconnect Calendar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* External Calendar Subscriptions Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">External Calendar Subscriptions</h2>
            <p className="text-gray-600">
              Subscribe to external calendars using iCal/ICS/webcal URLs (read-only).
              Supports school calendars, sports schedules, and other public calendars.
            </p>
          </div>
          {!showAddSubscription && !editingSubscription && (
            <button
              onClick={() => setShowAddSubscription(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Subscription</span>
            </button>
          )}
        </div>

        {/* Add Subscription Form */}
        {showAddSubscription && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Add Calendar Subscription</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Name *
                </label>
                <input
                  type="text"
                  value={subscriptionForm.name}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, name: e.target.value })}
                  placeholder="e.g., School Calendar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar URL *
                </label>
                <input
                  type="url"
                  value={subscriptionForm.url}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, url: e.target.value })}
                  placeholder="https://example.com/calendar.ics or webcal://example.com/calendar.ics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports http://, https://, and webcal:// URLs
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={subscriptionForm.description}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, description: e.target.value })}
                  placeholder="Brief description of this calendar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={subscriptionForm.color}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refresh Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={subscriptionForm.refreshInterval}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, refreshInterval: parseInt(e.target.value) || 1440 })}
                    min="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddSubscription}
                  disabled={validatingUrl}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {validatingUrl ? 'Validating...' : 'Add Subscription'}
                </button>
                <button
                  onClick={() => {
                    setShowAddSubscription(false);
                    setSubscriptionForm({
                      name: '',
                      url: '',
                      description: '',
                      color: '#9CA3AF',
                      refreshInterval: 1440,
                    });
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions List */}
        <div className="mt-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : subscriptions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-500 text-sm">No calendar subscriptions yet.</p>
              <p className="text-gray-400 text-xs mt-1">Add a subscription to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="border border-gray-200 rounded-lg p-4">
                  {editingSubscription?.id === subscription.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Calendar Name
                        </label>
                        <input
                          type="text"
                          value={editingSubscription.name}
                          onChange={(e) => setEditingSubscription({ ...editingSubscription, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={editingSubscription.description || ''}
                          onChange={(e) => setEditingSubscription({ ...editingSubscription, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={editingSubscription.color}
                            onChange={(e) => setEditingSubscription({ ...editingSubscription, color: e.target.value })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Refresh Interval (minutes)
                          </label>
                          <input
                            type="number"
                            value={editingSubscription.refreshInterval}
                            onChange={(e) => setEditingSubscription({ ...editingSubscription, refreshInterval: parseInt(e.target.value) || 1440 })}
                            min="60"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editingSubscription.isActive}
                            onChange={(e) => setEditingSubscription({ ...editingSubscription, isActive: e.target.checked })}
                            className="rounded"
                          />
                          <span>Active</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSubscription(subscription.id, {
                            name: editingSubscription.name,
                            description: editingSubscription.description,
                            color: editingSubscription.color,
                            refreshInterval: editingSubscription.refreshInterval,
                            isActive: editingSubscription.isActive,
                          })}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSubscription(null)}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: subscription.color }}
                            />
                            <span className="font-medium">{subscription.name}</span>
                            {getSubscriptionStatusBadge(subscription)}
                          </div>
                          {subscription.description && (
                            <p className="text-sm text-gray-600 mb-1">{subscription.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-1 break-all">{subscription.url}</p>
                          <div className="text-sm text-gray-600">
                            Last synced: {formatLastSync(subscription.lastSuccessfulSyncAt)}
                            {subscription.nextSyncAt && (
                              <span className="ml-4">
                                Next sync: {new Date(subscription.nextSyncAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {subscription.syncError && (
                            <div className="text-sm text-red-600 mt-1">
                              Error: {subscription.syncError}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSyncSubscription(subscription.id)}
                          disabled={syncingSubscription === subscription.id || !subscription.isActive}
                          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {syncingSubscription === subscription.id ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                          onClick={() => setEditingSubscription(subscription)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(subscription.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={disconnectConfirmModal.isOpen}
        onClose={() => setDisconnectConfirmModal({ isOpen: false, connectionId: null })}
        onConfirm={confirmDisconnect}
        title="Disconnect Calendar"
        message="Are you sure you want to disconnect this calendar? Events will no longer sync."
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Delete Subscription Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteSubscriptionConfirmModal.isOpen}
        onClose={() => setDeleteSubscriptionConfirmModal({ isOpen: false, subscriptionId: null })}
        onConfirm={confirmDeleteSubscription}
        title="Delete Calendar Subscription"
        message="Are you sure you want to delete this calendar subscription? All associated events will be removed."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}
