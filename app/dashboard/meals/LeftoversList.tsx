'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Creator {
  id: string;
  name: string;
}

interface Leftover {
  id: string;
  name: string;
  quantity: string | null;
  storedAt: Date;
  expiresAt: Date;
  notes: string | null;
  creator: Creator;
}

interface LeftoversResponse {
  leftovers: Leftover[];
}

type ExpirationStatus = 'fresh' | 'warning' | 'urgent';

export default function LeftoversList() {
  const router = useRouter();
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    daysUntilExpiry: '3',
    notes: '',
  });

  // Load leftovers on mount
  const loadLeftovers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meals/leftovers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load leftovers');
      }

      const data: LeftoversResponse = await response.json();
      // Convert date strings to Date objects
      const leftoversWithDates = (data.leftovers || []).map((leftover) => ({
        ...leftover,
        storedAt: leftover.storedAt instanceof Date ? leftover.storedAt : new Date(leftover.storedAt),
        expiresAt: leftover.expiresAt instanceof Date ? leftover.expiresAt : new Date(leftover.expiresAt),
      }));
      setLeftovers(leftoversWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leftovers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeftovers();
  }, []);

  // Calculate days until expiration
  const getDaysUntilExpiry = (expiresAt: Date): number => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get expiration status for color coding
  const getExpirationStatus = (expiresAt: Date): ExpirationStatus => {
    const days = getDaysUntilExpiry(expiresAt);
    if (days <= 0) return 'urgent';
    if (days === 1) return 'warning';
    return 'fresh';
  };

  // Get status color class
  const getStatusColor = (status: ExpirationStatus): string => {
    switch (status) {
      case 'fresh':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
    }
  };

  // Format expiration message
  const getExpirationMessage = (expiresAt: Date): string => {
    const days = getDaysUntilExpiry(expiresAt);
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  // Mark leftover as used
  const handleMarkUsed = async (id: string) => {
    try {
      const response = await fetch(`/api/meals/leftovers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'used' }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as used');
      }

      loadLeftovers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leftover');
    }
  };

  // Mark leftover as tossed
  const handleMarkTossed = async (id: string) => {
    try {
      const response = await fetch(`/api/meals/leftovers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'tossed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as tossed');
      }

      loadLeftovers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leftover');
    }
  };

  // Create new leftover
  const handleCreateLeftover = async () => {
    try {
      const response = await fetch('/api/meals/leftovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          quantity: formData.quantity || null,
          daysUntilExpiry: parseInt(formData.daysUntilExpiry),
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create leftover');
      }

      setShowAddDialog(false);
      setFormData({ name: '', quantity: '', daysUntilExpiry: '3', notes: '' });
      loadLeftovers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leftover');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading leftovers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Leftovers Tracker
          </h2>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            aria-label="Add leftover"
          >
            + Add Leftover
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Leftovers Tracker
        </h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          aria-label="Add leftover"
        >
          + Add Leftover
        </button>
      </div>

      {/* Leftovers List */}
      {!leftovers || leftovers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No leftovers tracked yet. Add one to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {leftovers.map((leftover) => {
            const status = getExpirationStatus(leftover.expiresAt);
            const statusColor = getStatusColor(status);
            const expirationMessage = getExpirationMessage(leftover.expiresAt);

            return (
              <div
                key={leftover.id}
                className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                onMouseEnter={() => setHoveredId(leftover.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {leftover.name}
                    </h3>
                    {leftover.quantity && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {leftover.quantity}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                        data-status={status}
                      >
                        {expirationMessage}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        by {leftover.creator.name}
                      </span>
                    </div>

                    {/* Notes tooltip */}
                    {leftover.notes && hoveredId === leftover.id && (
                      <div className="absolute z-10 mt-2 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg max-w-xs">
                        {leftover.notes}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleMarkUsed(leftover.id)}
                      className="px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800"
                      aria-label="Mark as used"
                    >
                      Used
                    </button>
                    <button
                      onClick={() => handleMarkTossed(leftover.id)}
                      className="px-3 py-1 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800"
                      aria-label="Mark as tossed"
                    >
                      Toss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Leftover Dialog */}
      {showAddDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Log Leftover
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="leftover-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  id="leftover-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Name"
                />
              </div>
              <div>
                <label
                  htmlFor="leftover-quantity"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Quantity (optional)
                </label>
                <input
                  id="leftover-quantity"
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g., Half pan, 2 servings"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Quantity"
                />
              </div>
              <div>
                <label
                  htmlFor="leftover-days"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Days until expiry
                </label>
                <input
                  id="leftover-days"
                  type="number"
                  min="1"
                  max="14"
                  value={formData.daysUntilExpiry}
                  onChange={(e) =>
                    setFormData({ ...formData, daysUntilExpiry: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="leftover-notes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="leftover-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLeftover}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  aria-label="Save"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
