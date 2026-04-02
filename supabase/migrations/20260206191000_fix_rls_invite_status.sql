-- Migration: Fix RLS functions to exclude PENDING members from data access
-- PENDING members should not have access to family data until they accept their invitation

-- Fix get_user_family_ids() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION get_user_family_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(family_id),
    ARRAY[]::UUID[]
  )
  FROM family_members
  WHERE auth_user_id = auth.uid()
    AND is_active = true
    AND (invite_status IS NULL OR invite_status = 'ACTIVE');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix is_member_of_family() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION is_member_of_family(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND family_id = check_family_id
      AND is_active = true
      AND (invite_status IS NULL OR invite_status = 'ACTIVE')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix is_parent_in_family() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION is_parent_in_family(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND family_id = check_family_id
      AND role = 'PARENT'
      AND is_active = true
      AND (invite_status IS NULL OR invite_status = 'ACTIVE')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix get_member_in_family() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION get_member_in_family(check_family_id UUID)
RETURNS UUID AS $$
  SELECT id FROM family_members
  WHERE auth_user_id = auth.uid()
    AND family_id = check_family_id
    AND is_active = true
    AND (invite_status IS NULL OR invite_status = 'ACTIVE')
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix get_role_in_family() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION get_role_in_family(check_family_id UUID)
RETURNS role AS $$
  SELECT role FROM family_members
  WHERE auth_user_id = auth.uid()
    AND family_id = check_family_id
    AND is_active = true
    AND (invite_status IS NULL OR invite_status = 'ACTIVE')
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix is_owner() to exclude PENDING invite status
CREATE OR REPLACE FUNCTION is_owner(owner_member_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND id = owner_member_id
      AND is_active = true
      AND (invite_status IS NULL OR invite_status = 'ACTIVE')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
