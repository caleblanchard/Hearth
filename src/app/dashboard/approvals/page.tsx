'use client';

import { useMemo } from 'react';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { useToast } from '@/components/ui/Toast';
import { useApprovalRequestLifecycle } from '@/hooks/useApprovalRequestLifecycle';
import type { ApprovalRequestQueueFilter } from '@/types/approval-request-lifecycle';

type FilterType = ApprovalRequestQueueFilter;

export default function ApprovalsPage() {
  const { showToast } = useToast();
  const {
    approvals,
    filter,
    setFilter,
    loading,
    processing,
    error,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    approveOne,
    denyOne,
    approveSelected,
    denySelected,
  } = useApprovalRequestLifecycle();

  const actionableCount = useMemo(
    () => approvals.filter((approval) => approval.actionable !== false).length,
    [approvals]
  );

  const handleApprove = async (id: string) => {
    try {
      const result = await approveOne(id);
      
      if (result.success.length > 0) {
        showToast('success', 'Approved successfully! ✓');
      } else if (result.failed.length > 0) {
        showToast('error', result.failed[0].reason);
      }
    } catch (error) {
      console.error('Error approving:', error);
      showToast('error', 'Failed to approve item');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      const result = await denyOne(id);
      
      if (result.success.length > 0) {
        showToast('success', 'Denied successfully');
      } else if (result.failed.length > 0) {
        showToast('error', result.failed[0].reason);
      }
    } catch (error) {
      console.error('Error denying:', error);
      showToast('error', 'Failed to deny item');
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    toggleSelect(id, selected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await approveSelected();
      
      showToast('success', `Approved ${result.success.length} item(s) ✓`);
      
      if (result.failed.length > 0) {
        showToast('error', `${result.failed.length} item(s) failed to approve`);
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      showToast('error', 'Failed to bulk approve items');
    }
  };

  const handleBulkDeny = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await denySelected();
      
      showToast('success', `Denied ${result.success.length} item(s)`);
      
      if (result.failed.length > 0) {
        showToast('error', `${result.failed.length} item(s) failed to deny`);
      }
    } catch (error) {
      console.error('Error bulk denying:', error);
      showToast('error', 'Failed to bulk deny items');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-900 dark:text-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <label htmlFor="filter" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Filter:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              <option value="CHORE_COMPLETION">Chores Only</option>
              <option value="REWARD_REDEMPTION">Rewards Only</option>
              <option value="SHOPPING_ITEM">Shopping Only</option>
            </select>
            
            {actionableCount > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === actionableCount ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/40 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-100">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={processing}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {processing ? 'Processing...' : 'Approve All'}
              </button>
              <button
                onClick={handleBulkDeny}
                disabled={processing}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {processing ? 'Processing...' : 'Deny All'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {approvals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/60 rounded-lg shadow-sm p-12 text-center border border-gray-100 dark:border-slate-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              No pending approvals at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={approval.actionable === false ? undefined : handleApprove}
                onDeny={approval.actionable === false ? undefined : handleDeny}
                onSelect={handleSelect}
                isSelected={selectedIds.has(approval.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
