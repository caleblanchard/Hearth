'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ApprovalItem } from '@/types/approvals';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalCardProps {
  approval: ApprovalItem;
  onApprove: (id: string) => void | Promise<void>;
  onDeny: (id: string) => void | Promise<void>;
  onSelect?: (id: string, selected: boolean) => void;
  isSelected?: boolean;
}

export function ApprovalCard({
  approval,
  onApprove,
  onDeny,
  onSelect,
  isSelected = false
}: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    setIsApproving(true);
    try {
      await onApprove(approval.id);
    } finally {
      setIsProcessing(false);
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    try {
      await onDeny(approval.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(approval.id, e.target.checked);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format type for display
  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase();
  };

  // Get priority badge styling
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get credit info based on type
  const getCreditInfo = () => {
    if (approval.type === 'CHORE_COMPLETION' && approval.metadata?.credits) {
      return `${approval.metadata.credits} credits`;
    }
    if (approval.type === 'REWARD_REDEMPTION' && approval.metadata?.costCredits) {
      return `${approval.metadata.costCredits} credits`;
    }
    return null;
  };

  // Format timestamp for display
  const getFormattedDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const relativeTime = formatDistanceToNow(new Date(approval.requestedAt), {
    addSuffix: true
  });

  const creditInfo = getCreditInfo();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Bulk selection checkbox */}
          {onSelect && (
            <div className="flex items-center pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          )}

          {/* Avatar or initials */}
          <div className="flex-shrink-0">
            {approval.familyMemberAvatarUrl ? (
              <Image
                src={approval.familyMemberAvatarUrl}
                alt={approval.familyMemberName}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                {getInitials(approval.familyMemberName)}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {approval.title}
                </h3>
                <p className="text-sm text-gray-600">{approval.familyMemberName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {getTypeLabel(approval.type)}
                  </span>
                  {creditInfo && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs font-medium text-green-600">
                        {creditInfo}
                      </span>
                    </>
                  )}
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{relativeTime}</span>
                </div>
              </div>

              {/* Priority badge */}
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeClass(
                  approval.priority
                )}`}
              >
                {approval.priority}
              </span>
            </div>

            {/* Photo preview for chores */}
            {approval.type === 'CHORE_COMPLETION' && approval.metadata?.photoUrl && (
              <div className="mt-3">
                <Image
                  src={approval.metadata.photoUrl}
                  alt="Chore photo proof"
                  width={300}
                  height={200}
                  className="rounded-lg object-cover"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={handleDeny}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Deny
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Requested at:</dt>
                    <dd className="text-gray-600">{getFormattedDate(approval.requestedAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Type:</dt>
                    <dd className="text-gray-600 capitalize">{getTypeLabel(approval.type)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Priority:</dt>
                    <dd className="text-gray-600">{approval.priority}</dd>
                  </div>
                  {approval.details && Object.keys(approval.details).length > 0 && (
                    <div>
                      <dt className="font-medium text-gray-700">Additional Details:</dt>
                      <dd className="text-gray-600">
                        {Object.entries(approval.details)
                          .filter(([key]) => key !== 'photoUrl')
                          .map(([key, value]) => (
                            <div key={key} className="ml-2">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                              {String(value)}
                            </div>
                          ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
