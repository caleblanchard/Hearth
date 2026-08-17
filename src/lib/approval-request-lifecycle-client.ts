import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  ApprovalRequestDecisionResult,
  ApprovalRequestListQuery,
  ApprovalRequestListResult,
  PendingRewardRedemptionRecord,
  RewardRedemptionDecisionResult,
} from '@/types/approval-request-lifecycle'

const approvalsClient = createLifecycleClient({ basePath: '/api/approvals' })

const bulkApproveClient = createLifecycleClient({ basePath: '/api/approvals/bulk-approve' })

const bulkDenyClient = createLifecycleClient({ basePath: '/api/approvals/bulk-deny' })

const redemptionsClient = createLifecycleClient({ basePath: '/api/rewards/redemptions' })

export function fetchApprovalRequests(
  query: ApprovalRequestListQuery = {},
): Promise<ApprovalRequestListResult> {
  return approvalsClient.action<ApprovalRequestListResult>('', 'GET', undefined, undefined, {
    type: query.type === 'ALL' ? undefined : query.type,
    memberId: query.memberId,
  })
}

export function approveApprovalRequests(itemIds: string[]): Promise<ApprovalRequestDecisionResult> {
  return bulkApproveClient.action<ApprovalRequestDecisionResult>('', 'POST', { itemIds })
}

export function denyApprovalRequests(itemIds: string[]): Promise<ApprovalRequestDecisionResult> {
  return bulkDenyClient.action<ApprovalRequestDecisionResult>('', 'POST', { itemIds })
}

export function fetchPendingRewardRedemptions(): Promise<{
  redemptions: PendingRewardRedemptionRecord[]
}> {
  return redemptionsClient.action<{ redemptions: PendingRewardRedemptionRecord[] }>('', 'GET')
}

export function approveRewardRedemption(
  redemptionId: string,
): Promise<{ success: true } & RewardRedemptionDecisionResult> {
  return redemptionsClient.action<{ success: true } & RewardRedemptionDecisionResult>(
    `/${redemptionId}/approve`,
    'POST',
  )
}

export function rejectRewardRedemption(
  redemptionId: string,
  reason?: string,
): Promise<{ success: true } & RewardRedemptionDecisionResult> {
  return redemptionsClient.action<{ success: true } & RewardRedemptionDecisionResult>(
    `/${redemptionId}/reject`,
    'POST',
    { reason },
  )
}
