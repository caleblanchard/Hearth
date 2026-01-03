'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertModal } from '@/components/ui/Modal';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Redemption {
  id: string;
  status: string;
  requestedAt: string;
  notes?: string;
  reward: {
    id: string;
    name: string;
    description?: string;
    costCredits: number;
    category: string;
  };
  member: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export default function RedemptionsPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchRedemptions = async () => {
    try {
      const response = await fetch('/api/rewards/redemptions');
      if (response.ok) {
        const data = await response.json();
        setRedemptions(data.redemptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch redemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const handleApprove = async (redemptionId: string) => {
    setProcessing(redemptionId);
    try {
      const response = await fetch(`/api/rewards/redemptions/${redemptionId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Redemption approved successfully',
        });
        await fetchRedemptions();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to approve redemption',
        });
      }
    } catch (error) {
      console.error('Error approving redemption:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to approve redemption',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (redemptionId: string) => {
    if (!rejectReason.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please provide a reason for rejection',
      });
      return;
    }

    setProcessing(redemptionId);
    try {
      const response = await fetch(`/api/rewards/redemptions/${redemptionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Redemption rejected successfully',
        });
        setRejectReason('');
        setRejectingId(null);
        await fetchRedemptions();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to reject redemption',
        });
      }
    } catch (error) {
      console.error('Error rejecting redemption:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to reject redemption',
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reward Redemptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve reward redemption requests
          </p>
        </div>

        {/* Redemptions List */}
        {redemptions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No pending redemptions!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-ember-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {redemption.member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {redemption.member.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(redemption.requestedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {redemption.reward.name}
                    </h3>
                    {redemption.reward.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {redemption.reward.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-ember-700 dark:text-ember-500 font-medium">
                        {redemption.reward.costCredits} credits
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {redemption.reward.category}
                      </span>
                    </div>
                    {redemption.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Notes:</strong> {redemption.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {rejectingId === redemption.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        onClick={() => handleReject(redemption.id)}
                        disabled={processing === redemption.id}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors"
                      >
                        {processing === redemption.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(redemption.id)}
                        disabled={processing === redemption.id}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        {processing === redemption.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-5 w-5" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingId(redemption.id)}
                        disabled={processing === redemption.id}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <XMarkIcon className="h-5 w-5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
