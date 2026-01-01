'use client';

import { useState } from 'react';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GraceStatus {
  canRequestGrace: boolean;
  currentBalance: number;
  lowBalanceWarning: boolean;
  remainingDailyRequests: number;
  remainingWeeklyRequests: number;
  nextResetTime: string;
  settings: {
    gracePeriodMinutes: number;
    maxGracePerDay: number;
    maxGracePerWeek: number;
    requiresApproval: boolean;
  };
}

interface GraceRequestButtonProps {
  status: GraceStatus;
  onGraceGranted: (newBalance: number) => void;
}

export default function GraceRequestButton({
  status,
  onGraceGranted,
}: GraceRequestButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Don't show if balance is not low or grace is not available
  if (!status.lowBalanceWarning || !status.canRequestGrace) {
    return null;
  }

  const handleRequest = async () => {
    setRequesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/screentime/grace/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.pendingApproval) {
          setMessage({
            type: 'info',
            text: 'Your request is pending approval from a parent.',
          });
        } else {
          setMessage({
            type: 'success',
            text: `Grace period granted! You received ${status.settings.gracePeriodMinutes} minutes.`,
          });
          onGraceGranted(data.newBalance);
        }
        setReason('');
        setTimeout(() => {
          setShowModal(false);
          setMessage(null);
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to request grace period',
        });
      }
    } catch (error) {
      console.error('Error requesting grace:', error);
      setMessage({
        type: 'error',
        text: 'Failed to request grace period',
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900 dark:text-yellow-100">
              Running low on screen time!
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You can request {status.remainingDailyRequests} more "Finish the Round" today
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            Finish the Round
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Request Grace Period
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Request an extra {status.settings.gracePeriodMinutes} minutes to finish what
                you're doing.
                {status.settings.requiresApproval && (
                  <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                    Note: This request requires parent approval.
                  </span>
                )}
              </p>

              <label
                htmlFor="grace-reason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Reason (optional)
              </label>
              <textarea
                id="grace-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional: Why do you need more time? (e.g., 'Middle of game level')"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={requesting}
              />
            </div>

            {message && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : message.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-semibold rounded-lg transition-colors"
              >
                {requesting ? 'Requesting...' : 'Request Grace Period'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={requesting}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
