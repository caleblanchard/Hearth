export type ApprovalRequestType =
  | 'CHORE_COMPLETION'
  | 'REWARD_REDEMPTION'
  | 'SHOPPING_ITEM'

export type ApprovalRequestQueueFilter = 'ALL' | ApprovalRequestType

export type ApprovalRequestPriority = 'HIGH' | 'NORMAL' | 'LOW'

export interface ApprovalRequestItem {
  id: string
  type: ApprovalRequestType
  familyMemberId: string
  familyMemberName: string
  familyMemberAvatarUrl?: string | null
  title: string
  description: string
  requestedAt: string | Date
  metadata: Record<string, unknown>
  priority: ApprovalRequestPriority
  actionable?: boolean
}

export interface ApprovalRequestListQuery {
  type?: ApprovalRequestQueueFilter | null
  memberId?: string | null
}

export interface ApprovalRequestListResult {
  approvals: ApprovalRequestItem[]
  total: number
}

export interface ApprovalRequestStats {
  total: number
  byType: {
    choreCompletions: number
    rewardRedemptions: number
    shoppingRequests: number
    calendarRequests: number
  }
  byPriority: {
    high: number
    normal: number
    low: number
  }
  oldestPending?: string
}

export interface ApprovalRequestDecisionInput {
  decision: 'APPROVE' | 'DENY'
  itemIds: string[]
}

export interface ApprovalRequestDecisionFailure {
  itemId: string
  reason: string
}

export interface ApprovalRequestDecisionResult {
  success: string[]
  failed: ApprovalRequestDecisionFailure[]
  total: number
}

export interface ApprovalRequestLifecycleOptions {
  unauthorizedMessage?: string
  noFamilyMessage?: string
  forbiddenMessage?: string
}

export interface PendingRewardRedemptionRecord {
  id: string
  status: string
  requestedAt: string
  notes?: string
  reward: {
    id: string
    name: string
    description?: string
    costCredits: number
    category: string
  }
  member: {
    id: string
    name: string
    avatarUrl?: string
  }
}

export interface PendingGraceApprovalRecord {
  id: string
  memberId: string
  memberName: string
  minutesGranted: number
  reason: string | null
  requestedAt: string
  currentBalance: number
}

export interface ApprovedChoreCompletionResult {
  completion: unknown
  creditsAwarded: number
  message: string
}

export interface RewardRedemptionDecisionResult {
  redemption: unknown
  message: string
}

export interface GraceApprovalDecisionResult {
  graceLog: unknown
  message: string
}
