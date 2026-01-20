'use client';

import { useState, useEffect } from 'react';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { ApprovalItem } from '@/types/approvals';
import { useToast } from '@/components/ui/Toast';

type FilterType = 'ALL' | 'CHORE_COMPLETION' | 'REWARD_REDEMPTION';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const { showToast } = useToast();

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const url = filter === 'ALL' 
        ? '/api/approvals' 
        : `/api/approvals?type=${filter}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      showToast('error', 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/approvals/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [id] })
      });

      if (!response.ok) {
        throw new Error('Failed to approve item');
      }

      const result = await response.json();
      
      if (result.success.length > 0) {
        showToast('success', 'Approved successfully! ✓');
        await fetchApprovals();
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
      const response = await fetch('/api/approvals/bulk-deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [id] })
      });

      if (!response.ok) {
        throw new Error('Failed to deny item');
      }

      const result = await response.json();
      
      if (result.success.length > 0) {
        showToast('success', 'Denied successfully');
        await fetchApprovals();
      } else if (result.failed.length > 0) {
        showToast('error', result.failed[0].reason);
      }
    } catch (error) {
      console.error('Error denying:', error);
      showToast('error', 'Failed to deny item');
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/approvals/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk approve');
      }

      const result = await response.json();
      
      showToast('success', `Approved ${result.success.length} item(s) ✓`);
      
      if (result.failed.length > 0) {
        showToast('error', `${result.failed.length} item(s) failed to approve`);
      }

      setSelectedIds(new Set());
      await fetchApprovals();
    } catch (error) {
      console.error('Error bulk approving:', error);
      showToast('error', 'Failed to bulk approve items');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDeny = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/approvals/bulk-deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk deny');
      }

      const result = await response.json();
      
      showToast('success', `Denied ${result.success.length} item(s)`);
      
      if (result.failed.length > 0) {
        showToast('error', `${result.failed.length} item(s) failed to deny`);
      }

      setSelectedIds(new Set());
      await fetchApprovals();
    } catch (error) {
      console.error('Error bulk denying:', error);
      showToast('error', 'Failed to bulk deny items');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map(a => a.id)));
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Approval Queue
          </h1>
          <p className="text-gray-600">
            Review and approve pending chore completions and reward redemptions
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <label htmlFor="filter" className="text-sm font-medium text-gray-700">
              Filter:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              <option value="CHORE_COMPLETION">Chores Only</option>
              <option value="REWARD_REDEMPTION">Rewards Only</option>
            </select>
            
            {approvals.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === approvals.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={bulkProcessing}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {bulkProcessing ? 'Processing...' : 'Approve All'}
              </button>
              <button
                onClick={handleBulkDeny}
                disabled={bulkProcessing}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {bulkProcessing ? 'Processing...' : 'Deny All'}
              </button>
            </div>
          )}
        </div>

        {approvals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600">
              No pending approvals at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onDeny={handleDeny}
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
