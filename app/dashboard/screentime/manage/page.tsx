'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertModal, ConfirmModal } from '@/components/ui/Modal';
import GraceSettingsPanel from '@/components/screentime/GraceSettingsPanel';
import {
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon,
  UserIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface FamilyMember {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  currentBalance: number;
  weeklyAllocation: number;
  weeklyUsage: number;
  weekStartDate?: string;
}

export default function ManageScreenTimePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [graceSettingsMember, setGraceSettingsMember] = useState<FamilyMember | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // Redirect non-parents
  useEffect(() => {
    if (session?.user?.role !== 'PARENT') {
      router.push('/dashboard/screentime');
    }
  }, [session, router]);

  const fetchFamilyData = async () => {
    try {
      const response = await fetch('/api/screentime/family');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch family data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'PARENT') {
      fetchFamilyData();
    }
  }, [session]);

  const handleAdjustBalance = async () => {
    if (!selectedMember || !adjustmentAmount || parseFloat(adjustmentAmount) === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a non-zero adjustment amount',
      });
      return;
    }

    setAdjusting(true);
    try {
      const response = await fetch('/api/screentime/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          amountMinutes: parseInt(adjustmentAmount),
          reason: adjustmentReason || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message,
        });
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setSelectedMember(null);
        await fetchFamilyData();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to adjust balance',
        });
      }
    } catch (error) {
      console.error('Error adjusting balance:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to adjust balance',
      });
    } finally {
      setAdjusting(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Screen Time Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage screen time balances and settings for your family
          </p>
        </div>

        {/* Family Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {members.map((member) => {
            const usagePercentage = member.weeklyAllocation > 0
              ? ((member.weeklyUsage / member.weeklyAllocation) * 100).toFixed(1)
              : 0;
            const remainingPercentage = member.weeklyAllocation > 0
              ? ((member.currentBalance / member.weeklyAllocation) * 100).toFixed(1)
              : 0;

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-ember-300 dark:bg-slate-900 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-ember-700 dark:text-ember-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
                    <span className="text-lg font-bold text-ember-700 dark:text-ember-500">
                      {formatTime(member.currentBalance)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Weekly Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(member.weeklyUsage)} / {formatTime(member.weeklyAllocation)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-ember-700 dark:bg-ember-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, parseFloat(usagePercentage as string))}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {usagePercentage}% used
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                      Adjust
                    </button>
                    <button
                      onClick={() => setGraceSettingsMember(member)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                      Grace
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No children found. Add family members to manage their screen time.
            </p>
          </div>
        )}

        {/* Adjustment Modal */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Adjust Balance - {selectedMember.name}
              </h2>

              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Current Balance:
                </p>
                <p className="text-3xl font-bold text-ember-700 dark:text-ember-500">
                  {formatTime(selectedMember.currentBalance)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adjustment Amount (minutes)
                  </label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="e.g., +30 or -15"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use positive numbers to add time, negative to remove
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Why are you adjusting the balance?"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAdjustBalance}
                    disabled={adjusting || !adjustmentAmount}
                    className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold rounded-lg transition-colors"
                  >
                    {adjusting ? 'Adjusting...' : 'Apply Adjustment'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      setAdjustmentAmount('');
                      setAdjustmentReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grace Settings Modal */}
        {graceSettingsMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full my-8">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Grace Settings - {graceSettingsMember.name}
                  </h2>
                  <button
                    onClick={() => setGraceSettingsMember(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <GraceSettingsPanel
                  memberId={graceSettingsMember.id}
                  memberName={graceSettingsMember.name}
                  onSettingsSaved={() => {
                    setTimeout(() => setGraceSettingsMember(null), 2000);
                  }}
                />
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
    </div>
  );
}
