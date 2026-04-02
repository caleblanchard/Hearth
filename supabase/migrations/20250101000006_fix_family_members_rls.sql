-- Fix family_members RLS policy to allow users to see their own records
-- This fixes the chicken-and-egg problem where users couldn't see their family_member
-- records because the policy relied on get_user_family_ids() which itself queries family_members

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view members in their families" ON family_members;

-- Create new policy that allows:
-- 1. Users to see their own family_member records (by auth_user_id)
-- 2. Users to see other members in families they belong to
CREATE POLICY "Users can view members in their families" ON family_members
  FOR SELECT USING (
    auth_user_id = auth.uid()  -- Can see own records
    OR 
    family_id = ANY(get_user_family_ids())  -- Can see others in same family
  );
