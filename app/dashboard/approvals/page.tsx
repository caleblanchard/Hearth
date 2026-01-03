'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon, CurrencyDollarIcon, CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PendingChore {
  id: string;
  name: string;
  description?: string;
  creditValue: number;
  difficulty: string;
  assignedTo: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  completedBy: {
    id: string;
    name: string;
  };
  completedAt: string;
  notes?: string;
  photoUrl?: string;
}

interface PendingGraceRequest {
  id: string;
  memberId: string;
  memberName: string;
  minutesGranted: number;
  reason?: string;
  requestedAt: string;
  currentBalance: number;
}

export default function ApprovalsPage() {
  const [chores, setChores] = useState<PendingChore[]>([]);
  const [graceRequests, setGraceRequests] = useState<PendingGraceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingGraceId, setProcessingGraceId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchPendingChores = async () => {
    try {
      const response = await fetch('/api/chores/pending-approval');
      if (response.ok) {
        const data = await response.json();
        setChores(data.chores || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending chores:', error);
    }
  };

  const fetchPendingGraceRequests = async () => {
    try {
      const response = await fetch('/api/screentime/grace/pending');
      if (response.ok) {
        const data = await response.json();
        setGraceRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending grace requests:', error);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      await Promise.all([fetchPendingChores(), fetchPendingGraceRequests()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleApprove = async (choreId: string) => {
    setProcessingId(choreId);
    try {
      const response = await fetch(`/api/chores/${choreId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        await fetchPendingChores();
      } else {
        alert(data.error || 'Failed to approve chore');
      }
    } catch (error) {
      console.error('Error approving chore:', error);
      alert('Failed to approve chore');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (choreId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingId(choreId);
    try {
      const response = await fetch(`/api/chores/${choreId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setRejectReason('');
        setRejectingId(null);
        await fetchPendingChores();
      } else {
        alert(data.error || 'Failed to reject chore');
      }
    } catch (error) {
      console.error('Error rejecting chore:', error);
      alert('Failed to reject chore');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveGrace = async (graceLogId: string) => {
    setProcessingGraceId(graceLogId);
    try {
      const response = await fetch('/api/screentime/grace/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graceLogId, approved: true }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Grace request approved!');
        await fetchPendingGraceRequests();
      } else {
        alert(data.error || 'Failed to approve grace request');
      }
    } catch (error) {
      console.error('Error approving grace request:', error);
      alert('Failed to approve grace request');
    } finally {
      setProcessingGraceId(null);
    }
  };

  const handleDenyGrace = async (graceLogId: string) => {
    setProcessingGraceId(graceLogId);
    try {
      const response = await fetch('/api/screentime/grace/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graceLogId, approved: false }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Grace request denied');
        await fetchPendingGraceRequests();
      } else {
        alert(data.error || 'Failed to deny grace request');
      }
    } catch (error) {
      console.error('Error denying grace request:', error);
      alert('Failed to deny grace request');
    } finally {
      setProcessingGraceId(null);
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Approvals
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve grace requests and completed chores
          </p>
        </div>

        {/* Pending Grace Requests */}
        {graceRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              Screen Time Grace Requests ({graceRequests.length})
            </h2>
            <div className="space-y-4">
              {graceRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          {request.memberName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {request.memberName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Requested {new Date(request.requestedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                          +{formatTime(request.minutesGranted)} grace time
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Current balance: {formatTime(request.currentBalance)}
                        </span>
                      </div>
                      {request.reason && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveGrace(request.id)}
                      disabled={processingGraceId === request.id}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      {processingGraceId === request.id ? (
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
                      onClick={() => handleDenyGrace(request.id)}
                      disabled={processingGraceId === request.id}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      {processingGraceId === request.id ? 'Denying...' : (
                        <>
                          <XMarkIcon className="h-5 w-5" />
                          Deny
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Chores List */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Chore Approvals
        </h2>
        {chores.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No chores pending approval!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chores.map((chore) => (
              <div
                key={chore.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {chore.name}
                    </h3>
                    {chore.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {chore.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-ember-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {chore.assignedTo.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {chore.assignedTo.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Completed {new Date(chore.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-ember-700 dark:text-ember-500 font-medium">
                        {chore.difficulty}
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        {chore.creditValue} credits
                      </span>
                    </div>
                    {chore.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Notes:</strong> {chore.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {rejectingId === chore.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        onClick={() => handleReject(chore.id)}
                        disabled={processingId === chore.id}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors duration-200"
                      >
                        {processingId === chore.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(chore.id)}
                        disabled={processingId === chore.id}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                      >
                        {processingId === chore.id ? (
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
                        onClick={() => setRejectingId(chore.id)}
                        disabled={processingId === chore.id}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
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
    </div>
  );
}
