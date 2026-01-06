'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ClockIcon,
  PlusIcon,
  MinusIcon,
  UserCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { AlertModal } from '@/components/ui/Modal';

interface Allowance {
  id: string;
  screenTimeTypeId: string;
  screenTimeTypeName: string;
  allowanceMinutes: number;
  period: 'DAILY' | 'WEEKLY';
  remainingMinutes?: number;
}

interface FamilyMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  currentBalance: number;
  weeklyAllocation: number;
  weeklyUsage: number;
  weekStartDate: string | null;
  allowances?: Allowance[];
}

interface AdjustmentForm {
  memberId: string;
  screenTimeTypeId: string;
  amountMinutes: number;
  reason: string;
}

export default function FamilyScreenTimeManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    memberId: '',
    screenTimeTypeId: '',
    amountMinutes: 0,
    reason: '',
  });
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // Check if user is a parent
  useEffect(() => {
    if (session?.user && session.user.role !== 'PARENT') {
      router.push('/dashboard/screentime');
    }
  }, [session, router]);

  const fetchFamilyScreenTime = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/screentime/family');
      if (!response.ok) {
        throw new Error('Failed to fetch family screen time data');
      }
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching family screen time:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load family screen time data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'PARENT') {
      fetchFamilyScreenTime();
    }
  }, [session]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleQuickAdjust = (memberId: string, amount: number) => {
    // For quick adjust, we need to show the modal to select type
    setAdjustmentForm({
      memberId,
      screenTimeTypeId: '',
      amountMinutes: amount,
      reason: `Quick adjustment: ${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} minutes`,
    });
    setShowAdjustmentModal(true);
  };

  const handleAdjust = async () => {
    if (!adjustmentForm.memberId || !adjustmentForm.screenTimeTypeId || adjustmentForm.amountMinutes === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please select a member, screen time type, and enter a non-zero amount',
      });
      return;
    }

    setAdjusting(adjustmentForm.memberId);
    try {
      const response = await fetch('/api/screentime/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: adjustmentForm.memberId,
          screenTimeTypeId: adjustmentForm.screenTimeTypeId,
          amountMinutes: adjustmentForm.amountMinutes,
          reason: adjustmentForm.reason || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: data.message || 'Screen time adjusted successfully',
        });
        setShowAdjustmentModal(false);
        setAdjustmentForm({ memberId: '', screenTimeTypeId: '', amountMinutes: 0, reason: '' });
        // Refresh data
        await fetchFamilyScreenTime();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to adjust screen time',
        });
      }
    } catch (error) {
      console.error('Error adjusting screen time:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to adjust screen time',
      });
    } finally {
      setAdjusting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'PARENT') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Family Screen Time Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage screen time for all family members
              </p>
            </div>
            <button
              onClick={fetchFamilyScreenTime}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Family Members Grid */}
        {members.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No family members found with screen time configured
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => {
              const usagePercentage =
                member.weeklyAllocation > 0
                  ? (member.weeklyUsage / member.weeklyAllocation) * 100
                  : 0;
              const remainingPercentage =
                member.weeklyAllocation > 0
                  ? (member.currentBalance / member.weeklyAllocation) * 100
                  : 0;
              const isLow = remainingPercentage < 20;

              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700"
                >
                  {/* Member Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-ember-100 dark:bg-ember-900/30 flex items-center justify-center">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-ember-700 dark:text-ember-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {member.role.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Current Balance
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          isLow
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-ember-700 dark:text-ember-500'
                        }`}
                      >
                        {formatTime(member.currentBalance)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isLow
                            ? 'bg-red-600 dark:bg-red-400'
                            : 'bg-ember-700 dark:bg-ember-500'
                        }`}
                        style={{ width: `${Math.min(100, remainingPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Weekly Stats */}
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Weekly Allocation</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatTime(member.weeklyAllocation)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">This Week Used</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatTime(member.weeklyUsage)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                      <span
                        className={`font-medium ${
                          isLow
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {formatTime(member.currentBalance)}
                      </span>
                    </div>
                    {member.allowances && member.allowances.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                          Type-Specific Allowances:
                        </p>
                        <div className="space-y-2">
                          {member.allowances.map((allowance) => {
                            const remaining = allowance.remainingMinutes ?? allowance.allowanceMinutes;
                            const used = allowance.allowanceMinutes - remaining;
                            const percentage = allowance.allowanceMinutes > 0
                              ? (remaining / allowance.allowanceMinutes) * 100
                              : 0;
                            const isLow = percentage < 20;
                            
                            return (
                              <div
                                key={allowance.id}
                                className="space-y-1"
                              >
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    {allowance.screenTimeTypeName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${
                                      isLow
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>
                                      {formatTime(remaining)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      / {formatTime(allowance.allowanceMinutes)}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 text-[10px]">
                                      {allowance.period === 'DAILY' ? '/day' : '/week'}
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      isLow
                                        ? 'bg-red-600 dark:bg-red-400'
                                        : 'bg-green-600 dark:text-green-400'
                                    }`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Quick Adjustments
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => handleQuickAdjust(member.id, 15)}
                        disabled={adjusting === member.id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        +15m
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(member.id, 30)}
                        disabled={adjusting === member.id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        +30m
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(member.id, 60)}
                        disabled={adjusting === member.id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        +1h
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(member.id, -15)}
                        disabled={adjusting === member.id || member.currentBalance < 15}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <MinusIcon className="h-4 w-4" />
                        -15m
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setAdjustmentForm({
                          memberId: member.id,
                          screenTimeTypeId: '',
                          amountMinutes: 0,
                          reason: '',
                        });
                        setShowAdjustmentModal(true);
                      }}
                      disabled={adjusting === member.id}
                      className="w-full px-4 py-2 bg-ember-700 hover:bg-ember-600 disabled:bg-ember-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ClockIcon className="h-4 w-4" />
                      Custom Adjustment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Adjust Screen Time
            </h3>

            {/* Member Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Family Member
              </label>
              <select
                value={adjustmentForm.memberId}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, memberId: e.target.value, screenTimeTypeId: '' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({formatTime(member.currentBalance)} remaining)
                  </option>
                ))}
              </select>
            </div>

            {/* Screen Time Type Selection */}
            {adjustmentForm.memberId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Screen Time Type *
                </label>
                <select
                  value={adjustmentForm.screenTimeTypeId}
                  onChange={(e) =>
                    setAdjustmentForm({ ...adjustmentForm, screenTimeTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a screen time type...</option>
                  {members
                    .find((m) => m.id === adjustmentForm.memberId)
                    ?.allowances?.map((allowance) => (
                      <option key={allowance.id} value={allowance.screenTimeTypeId}>
                        {allowance.screenTimeTypeName} ({formatTime(allowance.remainingMinutes || 0)} remaining)
                      </option>
                    ))}
                </select>
                {members.find((m) => m.id === adjustmentForm.memberId)?.allowances?.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    No screen time types configured for this member
                  </p>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={adjustmentForm.amountMinutes || ''}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      amountMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter minutes (positive to add, negative to remove)"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        amountMinutes: (adjustmentForm.amountMinutes || 0) + 15,
                      })
                    }
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    +15
                  </button>
                  <button
                    onClick={() =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        amountMinutes: (adjustmentForm.amountMinutes || 0) - 15,
                      })
                    }
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    -15
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Positive numbers add time, negative numbers remove time
              </p>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                }
                placeholder="Optional reason for this adjustment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Preview */}
            {adjustmentForm.memberId && adjustmentForm.screenTimeTypeId && adjustmentForm.amountMinutes !== 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Preview:</strong> {adjustmentForm.amountMinutes > 0 ? 'Add' : 'Remove'}{' '}
                  {formatTime(Math.abs(adjustmentForm.amountMinutes))} to{' '}
                  {members.find((m) => m.id === adjustmentForm.memberId)?.name}'s{' '}
                  {members
                    .find((m) => m.id === adjustmentForm.memberId)
                    ?.allowances?.find((a) => a.screenTimeTypeId === adjustmentForm.screenTimeTypeId)
                    ?.screenTimeTypeName || 'screen time'}
                  {adjustmentForm.amountMinutes < 0 && (
                    <>
                      {' '}
                      (current remaining:{' '}
                      {formatTime(
                        members
                          .find((m) => m.id === adjustmentForm.memberId)
                          ?.allowances?.find((a) => a.screenTimeTypeId === adjustmentForm.screenTimeTypeId)
                          ?.remainingMinutes || 0
                      )}
                      )
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAdjust}
                disabled={
                  adjusting !== null ||
                  !adjustmentForm.memberId ||
                  !adjustmentForm.screenTimeTypeId ||
                  adjustmentForm.amountMinutes === 0
                }
                className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-600 disabled:bg-ember-400 text-white rounded-lg font-medium transition-colors"
              >
                {adjusting ? 'Adjusting...' : 'Apply Adjustment'}
              </button>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setAdjustmentForm({ memberId: '', amountMinutes: 0, reason: '' });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
