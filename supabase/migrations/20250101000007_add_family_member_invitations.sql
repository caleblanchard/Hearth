-- Migration: Add family member invitation support
-- This allows parents to invite other adults to join the family via email invitation

-- Add invite_status to family_members to track invitation state
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS invite_status invite_status DEFAULT 'ACTIVE';

-- Add invited_by to track who sent the invitation
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES family_members(id) ON DELETE SET NULL;

-- Add invite_token for linking invitation acceptance to member record
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- Add invite_sent_at to track when invitation was sent
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;

-- Add invite_expires_at to handle expiration
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- Create index for invite lookups
CREATE INDEX IF NOT EXISTS idx_family_members_invite_token ON family_members(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_members_invite_status ON family_members(invite_status) WHERE invite_status = 'PENDING';

-- Update existing members to have ACTIVE status (they're already fully set up)
UPDATE family_members SET invite_status = 'ACTIVE' WHERE invite_status IS NULL;

-- Add audit actions for invitations
-- Note: The audit_action enum already includes MEMBER_ADDED which we can use
-- But let's add specific invite actions if not present
DO $$
BEGIN
  -- Check if MEMBER_INVITED exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEMBER_INVITED' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'MEMBER_INVITED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEMBER_INVITE_ACCEPTED' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'MEMBER_INVITE_ACCEPTED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEMBER_INVITE_RESENT' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'MEMBER_INVITE_RESENT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEMBER_INVITE_CANCELLED' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'MEMBER_INVITE_CANCELLED';
  END IF;
END $$;

-- Comment explaining the invitation flow
COMMENT ON COLUMN family_members.invite_status IS 'Invitation status: PENDING (invited, not yet accepted), ACTIVE (fully set up), EXPIRED (invitation expired), REVOKED (invitation cancelled)';
COMMENT ON COLUMN family_members.invited_by IS 'The family member who sent the invitation';
COMMENT ON COLUMN family_members.invite_token IS 'Secure token used to link Supabase auth invitation to this member record';
COMMENT ON COLUMN family_members.invite_sent_at IS 'When the invitation email was sent';
COMMENT ON COLUMN family_members.invite_expires_at IS 'When the invitation expires (default: 7 days)';
