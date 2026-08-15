import type {
  ApprovalRequestDecisionResult,
  ApprovalRequestListQuery,
  ApprovalRequestListResult,
  PendingRewardRedemptionRecord,
  RewardRedemptionDecisionResult,
} from '@/types/approval-request-lifecycle'
import { apiRequest } from '@/lib/api-client'

export async function fetchApprovalRequests(
  query: ApprovalRequestListQuery = {}
): Promise<ApprovalRequestListResult> {
  const params = new URLSearchParams()

  if (query.type && query.type !== 'ALL') {
    params.set('type', query.type)
  }

  if (query.memberId) {
    params.set('memberId', query.memberId)
  }

  const suffix = params.toString()
  return apiRequest<ApprovalRequestListResult>(suffix ? `/api/approvals?${suffix}` : '/api/approvals')
}

export async function approveApprovalRequests(
  itemIds: string[]
): Promise<ApprovalRequestDecisionResult> {
  return apiRequest<ApprovalRequestDecisionResult>('/api/approvals/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
}

export async function denyApprovalRequests(
  itemIds: string[]
): Promise<ApprovalRequestDecisionResult> {
  return apiRequest<ApprovalRequestDecisionResult>('/api/approvals/bulk-deny', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
}

export async function fetchPendingRewardRedemptions(): Promise<{
  redemptions: PendingRewardRedemptionRecord[]
}> {
  return apiRequest<{ redemptions: PendingRewardRedemptionRecord[] }>('/api/rewards/redemptions')
}

export async function approveRewardRedemption(
  redemptionId: string
): Promise<{ success: true } & RewardRedemptionDecisionResult> {
  return apiRequest<{ success: true } & RewardRedemptionDecisionResult>(
    `/api/rewards/redemptions/${redemptionId}/approve`,
    { method: 'POST' }
  )
}

export async function rejectRewardRedemption(
  redemptionId: string,
  reason?: string
): Promise<{ success: true } & RewardRedemptionDecisionResult> {
  return apiRequest<{ success: true } & RewardRedemptionDecisionResult>(
    `/api/rewards/redemptions/${redemptionId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  )
}
