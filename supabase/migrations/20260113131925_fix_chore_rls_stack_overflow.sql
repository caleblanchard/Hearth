-- Fix RLS policies for chore tables to prevent stack depth overflow
-- The issue: circular RLS checks cause recursion when inserting chore_assignments
-- 
-- Original problem:
-- 1. chore_assignments RLS calls get_family_id_from_chore_schedule()
-- 2. That function joins chore_schedules (which has its own RLS)
-- 3. chore_schedules RLS queries chore_definitions (which has its own RLS)
-- 4. This creates deep recursion during INSERT operations
--
-- Solution: Create SECURITY DEFINER function that bypasses RLS for policy checks

-- Create a helper function that bypasses RLS to get valid schedule IDs
-- This function runs with elevated privileges and doesn't trigger RLS on the tables it queries
CREATE OR REPLACE FUNCTION get_user_chore_schedule_ids()
RETURNS SETOF UUID AS $$
  SELECT cs.id 
  FROM chore_schedules cs
  JOIN chore_definitions cd ON cd.id = cs.chore_definition_id
  WHERE cd.family_id = ANY(get_user_family_ids())
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "family_isolation" ON chore_schedules;
DROP POLICY IF EXISTS "family_isolation" ON chore_assignments;

-- Recreate chore_schedules policy with simpler check
-- Only check chore_definition_id directly (no function call that triggers nested RLS)
CREATE POLICY "family_isolation" ON chore_schedules
  FOR ALL USING (
    chore_definition_id IN (
      SELECT id FROM chore_definitions WHERE family_id = ANY(get_user_family_ids())
    )
  );

-- Recreate chore_assignments policy using SECURITY DEFINER function
-- This avoids the nested RLS checks that cause stack overflow
CREATE POLICY "family_isolation" ON chore_assignments
  FOR ALL USING (
    chore_schedule_id IN (SELECT * FROM get_user_chore_schedule_ids())
  );
