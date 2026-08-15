-- ============================================
-- Add REWARD_REJECTED to audit_action enum
-- Records parent rejection of a reward redemption
-- request in the audit trail.
-- ============================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'REWARD_REJECTED';
