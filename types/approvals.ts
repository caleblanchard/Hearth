/**
 * Unified Approval Queue Types
 * 
 * Provides a unified interface for all pending approval items across modules
 */

export type ApprovalType = 
  | 'CHORE_COMPLETION' 
  | 'REWARD_REDEMPTION' 
  | 'SHOPPING_ITEM_REQUEST'
  | 'CALENDAR_EVENT_REQUEST';

export type ApprovalPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface ApprovalItem {
  id: string;
  type: ApprovalType;
  familyMemberId: string;
  familyMemberName: string;
  familyMemberAvatarUrl?: string;
  title: string;
  description: string;
  requestedAt: Date;
  metadata: Record<string, any>; // Module-specific data
  priority: ApprovalPriority;
}

export interface ApprovalStats {
  total: number;
  byType: {
    choreCompletions: number;
    rewardRedemptions: number;
    shoppingRequests: number;
    calendarRequests: number;
  };
  byPriority: {
    high: number;
    normal: number;
    low: number;
  };
  oldestPending?: Date;
}

export interface BulkApprovalRequest {
  itemIds: string[]; // Array of approval item IDs in format "type-id" (e.g., "chore-abc123", "reward-xyz789")
}

export interface BulkApprovalResponse {
  success: string[]; // Array of successfully processed itemIds
  failed: Array<{
    itemId: string;
    reason: string;
  }>;
  total: number;
}
