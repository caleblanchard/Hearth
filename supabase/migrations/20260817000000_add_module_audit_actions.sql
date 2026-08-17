-- ============================================
-- Add audit actions for feature modules that were
-- previously written with `as any` casts (missing
-- from the enum, so those audit inserts failed at
-- the DB constraint and were silently swallowed).
-- ============================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'MEMBER_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'MEMBER_DELETED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CHORE_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CALENDAR_EVENT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TODO_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'REWARD_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'REWARD_DELETED';
