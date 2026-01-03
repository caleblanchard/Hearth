'use client';

import { useState, useEffect } from 'react';

interface GuestInvite {
  id: string;
  guestName: string;
  guestEmail: string | null;
  accessLevel: string;
  inviteCode: string;
  inviteToken: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  status: string;
  lastAccessedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
  };
  sessions: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    ipAddress: string;
  }>;
}

interface GuestInvitesResponse {
  invites: GuestInvite[];
}

export default function GuestManagement() {
  const [invites, setInvites] = useState<GuestInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('VIEW_ONLY');
  const [durationHours, setDurationHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);

  const loadInvites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/family/guests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load guest invites');
      }

      const data: GuestInvitesResponse = await response.json();
      setInvites(data.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guest invites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/family/guests/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestName,
          guestEmail: guestEmail || null,
          accessLevel,
          durationHours,
          maxUses,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create guest invite');
      }

      // Reset form
      setGuestName('');
      setGuestEmail('');
      setAccessLevel('VIEW_ONLY');
      setDurationHours(24);
      setMaxUses(1);
      setShowCreateForm(false);

      // Reload invites
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guest invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this guest invite? All active sessions will be ended.')) {
      return;
    }

    try {
      const response = await fetch(`/api/family/guests/${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke guest invite');
      }

      // Reload invites
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke guest invite');
    }
  };

  const getAccessLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      VIEW_ONLY: 'View Only',
      LIMITED: 'Limited Access',
      CAREGIVER: 'Caregiver',
    };
    return labels[level] || level;
  };

  const getAccessLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      VIEW_ONLY: 'bg-info/20 dark:bg-info/30 text-info dark:text-info',
      LIMITED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      CAREGIVER: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    };
    return colors[level] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
  };

  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const getExpiryText = (expiresAt: string): string => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursUntilExpiry < 0) return 'Expired';
    if (hoursUntilExpiry === 0) return 'Expires in less than 1 hour';
    if (hoursUntilExpiry === 1) return 'Expires in 1 hour';
    if (hoursUntilExpiry < 24) return `Expires in ${hoursUntilExpiry} hours`;
    const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24);
    if (daysUntilExpiry === 1) return 'Expires in 1 day';
    return `Expires in ${daysUntilExpiry} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading guest invites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Invite Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Create Guest Invite'}
        </button>
      </div>

      {/* Create Invite Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Create Guest Invite
          </h2>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Guest Name *
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., Grandma, Babysitter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Guest Email (optional)
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="guest@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Level *
              </label>
              <select
                required
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="VIEW_ONLY">View Only - Can only view information</option>
                <option value="LIMITED">Limited Access - Can view and interact with some features</option>
                <option value="CAREGIVER">Caregiver - Full access for caregiving needs</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (hours) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="720"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  24 hours = 1 day, 168 hours = 1 week
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Uses *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of times the code can be used
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white rounded-lg font-medium transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guest Invites List */}
      {invites.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No active guest invites. Create one to give temporary access to family helpers.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {invite.guestName}
                  </h3>
                  {invite.guestEmail && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{invite.guestEmail}</p>
                  )}
                </div>
              </div>

              {/* Access Level Badge */}
              <div className="mb-3">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getAccessLevelColor(invite.accessLevel)}`}>
                  {getAccessLevelLabel(invite.accessLevel)}
                </span>
              </div>

              {/* Invite Code */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Invite Code</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-wider">
                  {invite.inviteCode}
                </p>
              </div>

              {/* Status Info */}
              <div className="space-y-2 mb-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Uses:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {invite.useCount} / {invite.maxUses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={isExpired(invite.expiresAt) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {getExpiryText(invite.expiresAt)}
                  </span>
                </div>
                {invite.sessions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Active Sessions:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {invite.sessions.filter(s => !s.endedAt).length}
                    </span>
                  </div>
                )}
                {invite.lastAccessedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last used: {new Date(invite.lastAccessedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Created By */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Created by {invite.invitedBy.name} on {new Date(invite.createdAt).toLocaleDateString()}
              </p>

              {/* Actions */}
              <button
                onClick={() => handleRevokeInvite(invite.id)}
                className="w-full px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
