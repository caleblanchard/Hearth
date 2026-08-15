import type {
  ApprovalRequestDecisionResult,
  ApprovalRequestItem,
  ApprovalRequestPriority,
  ApprovalRequestStats,
  ApprovalRequestType,
} from '@/types/approval-request-lifecycle'

export type ApprovalType = ApprovalRequestType
export type ApprovalPriority = ApprovalRequestPriority
export type ApprovalItem = ApprovalRequestItem
export type ApprovalStats = ApprovalRequestStats

export interface BulkApprovalRequest {
  itemIds: string[]
}

export type BulkApprovalResponse = ApprovalRequestDecisionResult
