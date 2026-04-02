-- Hearth Cloud Deployment Migration 00003
-- Row Level Security Helper Functions
-- These functions are used by RLS policies to enforce data isolation

-- ============================================
-- CORE RLS HELPER FUNCTIONS
-- ============================================

-- NOTE: auth.uid() is built into Supabase, no need to create it
-- It returns the current authenticated user's ID or NULL if not authenticated

-- Get all family IDs the current user belongs to
-- Returns empty array if not authenticated or no family memberships
CREATE OR REPLACE FUNCTION get_user_family_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(family_id),
    ARRAY[]::UUID[]
  )
  FROM family_members
  WHERE auth_user_id = auth.uid()
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user belongs to a specific family
CREATE OR REPLACE FUNCTION is_member_of_family(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND family_id = check_family_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a parent in a specific family
CREATE OR REPLACE FUNCTION is_parent_in_family(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND family_id = check_family_id
      AND role = 'PARENT'
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's family member record for a specific family
CREATE OR REPLACE FUNCTION get_member_in_family(check_family_id UUID)
RETURNS UUID AS $$
  SELECT id FROM family_members
  WHERE auth_user_id = auth.uid()
    AND family_id = check_family_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's role in a specific family
CREATE OR REPLACE FUNCTION get_role_in_family(check_family_id UUID)
RETURNS role AS $$
  SELECT role FROM family_members
  WHERE auth_user_id = auth.uid()
    AND family_id = check_family_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is the owner/creator of a record
CREATE OR REPLACE FUNCTION is_owner(owner_member_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE auth_user_id = auth.uid()
      AND id = owner_member_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- KIOSK MODE HELPER FUNCTIONS
-- ============================================

-- Check if there's an active kiosk session for the family
-- and the current user is the one who activated it
CREATE OR REPLACE FUNCTION has_active_kiosk_session(check_family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM kiosk_sessions ks
    JOIN family_members fm ON fm.id = ks.current_member_id OR
      fm.auth_user_id = auth.uid()
    WHERE ks.family_id = check_family_id
      AND ks.is_active = true
      AND fm.auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- UTILITY FUNCTIONS FOR COMPLEX POLICIES
-- ============================================

-- Get family_id from a table that has family_id column
-- Useful for nested queries in policies
CREATE OR REPLACE FUNCTION get_family_id_from_member(member_id UUID)
RETURNS UUID AS $$
  SELECT family_id FROM family_members WHERE id = member_id;
$$ LANGUAGE sql STABLE;

-- Get family_id from chore_schedule (via chore_definition)
CREATE OR REPLACE FUNCTION get_family_id_from_chore_schedule(schedule_id UUID)
RETURNS UUID AS $$
  SELECT cd.family_id
  FROM chore_schedules cs
  JOIN chore_definitions cd ON cd.id = cs.chore_definition_id
  WHERE cs.id = schedule_id;
$$ LANGUAGE sql STABLE;

-- Get family_id from shopping_item (via shopping_list)
CREATE OR REPLACE FUNCTION get_family_id_from_shopping_item(list_id UUID)
RETURNS UUID AS $$
  SELECT family_id FROM shopping_lists WHERE id = list_id;
$$ LANGUAGE sql STABLE;

-- Get family_id from meal_plan_entry (via meal_plan)
CREATE OR REPLACE FUNCTION get_family_id_from_meal_plan_entry(plan_id UUID)
RETURNS UUID AS $$
  SELECT family_id FROM meal_plans WHERE id = plan_id;
$$ LANGUAGE sql STABLE;

-- Get family_id from routine_step (via routine)
CREATE OR REPLACE FUNCTION get_family_id_from_routine_step(routine_id UUID)
RETURNS UUID AS $$
  SELECT family_id FROM routines WHERE id = routine_id;
$$ LANGUAGE sql STABLE;

-- Get family_id from project_task (via project)
CREATE OR REPLACE FUNCTION get_family_id_from_project_task(project_id UUID)
RETURNS UUID AS $$
  SELECT family_id FROM projects WHERE id = project_id;
$$ LANGUAGE sql STABLE;

-- ============================================
-- TRANSACTION FUNCTIONS (for atomic operations)
-- ============================================

-- Complete a chore and award credits atomically
CREATE OR REPLACE FUNCTION complete_chore_with_credits(
  p_instance_id UUID,
  p_completed_by_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_instance chore_instances;
  v_schedule chore_schedules;
  v_definition chore_definitions;
  v_credit_value INT;
  v_family_id UUID;
BEGIN
  -- Get the chore instance
  SELECT * INTO v_instance FROM chore_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore instance not found';
  END IF;

  IF v_instance.status != 'PENDING' THEN
    RAISE EXCEPTION 'Chore is not in pending status';
  END IF;

  -- Get schedule and definition
  SELECT * INTO v_schedule FROM chore_schedules WHERE id = v_instance.chore_schedule_id;
  SELECT * INTO v_definition FROM chore_definitions WHERE id = v_schedule.chore_definition_id;

  v_credit_value := v_definition.credit_value;
  v_family_id := v_definition.family_id;

  -- Update the chore instance
  UPDATE chore_instances SET
    status = CASE WHEN v_schedule.requires_approval THEN 'COMPLETED' ELSE 'APPROVED' END,
    completed_at = now(),
    completed_by_id = p_completed_by_id,
    notes = COALESCE(p_notes, notes),
    photo_url = COALESCE(p_photo_url, photo_url),
    credits_awarded = CASE WHEN v_schedule.requires_approval THEN NULL ELSE v_credit_value END,
    updated_at = now()
  WHERE id = p_instance_id;

  -- If no approval required and has credits, award them immediately
  IF NOT v_schedule.requires_approval AND v_credit_value > 0 THEN
    -- Update credit balance
    INSERT INTO credit_balances (member_id, current_balance, lifetime_earned)
    VALUES (p_completed_by_id, v_credit_value, v_credit_value)
    ON CONFLICT (member_id) DO UPDATE SET
      current_balance = credit_balances.current_balance + v_credit_value,
      lifetime_earned = credit_balances.lifetime_earned + v_credit_value,
      updated_at = now();

    -- Create credit transaction
    INSERT INTO credit_transactions (member_id, type, amount, balance_after, reason, related_chore_instance_id)
    SELECT
      p_completed_by_id,
      'CHORE_REWARD',
      v_credit_value,
      current_balance,
      'Completed: ' || v_definition.name,
      p_instance_id
    FROM credit_balances WHERE member_id = p_completed_by_id;
  END IF;

  RETURN json_build_object(
    'instance_id', p_instance_id,
    'status', CASE WHEN v_schedule.requires_approval THEN 'COMPLETED' ELSE 'APPROVED' END,
    'credits_awarded', CASE WHEN v_schedule.requires_approval THEN 0 ELSE v_credit_value END,
    'requires_approval', v_schedule.requires_approval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve a completed chore and award credits
CREATE OR REPLACE FUNCTION approve_chore(
  p_instance_id UUID,
  p_approved_by_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_instance chore_instances;
  v_schedule chore_schedules;
  v_definition chore_definitions;
  v_credit_value INT;
BEGIN
  -- Get the chore instance
  SELECT * INTO v_instance FROM chore_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore instance not found';
  END IF;

  IF v_instance.status != 'COMPLETED' THEN
    RAISE EXCEPTION 'Chore is not in completed status (awaiting approval)';
  END IF;

  -- Get schedule and definition
  SELECT * INTO v_schedule FROM chore_schedules WHERE id = v_instance.chore_schedule_id;
  SELECT * INTO v_definition FROM chore_definitions WHERE id = v_schedule.chore_definition_id;

  v_credit_value := v_definition.credit_value;

  -- Update the chore instance
  UPDATE chore_instances SET
    status = 'APPROVED',
    approved_at = now(),
    approved_by_id = p_approved_by_id,
    credits_awarded = v_credit_value,
    updated_at = now()
  WHERE id = p_instance_id;

  -- Award credits if applicable
  IF v_credit_value > 0 THEN
    -- Update credit balance
    INSERT INTO credit_balances (member_id, current_balance, lifetime_earned)
    VALUES (v_instance.assigned_to_id, v_credit_value, v_credit_value)
    ON CONFLICT (member_id) DO UPDATE SET
      current_balance = credit_balances.current_balance + v_credit_value,
      lifetime_earned = credit_balances.lifetime_earned + v_credit_value,
      updated_at = now();

    -- Create credit transaction
    INSERT INTO credit_transactions (member_id, type, amount, balance_after, reason, related_chore_instance_id)
    SELECT
      v_instance.assigned_to_id,
      'CHORE_REWARD',
      v_credit_value,
      current_balance,
      'Approved: ' || v_definition.name,
      p_instance_id
    FROM credit_balances WHERE member_id = v_instance.assigned_to_id;
  END IF;

  RETURN json_build_object(
    'instance_id', p_instance_id,
    'status', 'APPROVED',
    'credits_awarded', v_credit_value,
    'awarded_to', v_instance.assigned_to_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem a reward (deduct credits, create redemption)
CREATE OR REPLACE FUNCTION redeem_reward(
  p_reward_id UUID,
  p_member_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_reward reward_items;
  v_balance credit_balances;
  v_transaction_id UUID;
  v_redemption_id UUID;
BEGIN
  -- Get reward
  SELECT * INTO v_reward FROM reward_items WHERE id = p_reward_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  IF v_reward.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Reward is not available';
  END IF;

  IF v_reward.quantity IS NOT NULL AND v_reward.quantity <= 0 THEN
    RAISE EXCEPTION 'Reward is out of stock';
  END IF;

  -- Get current balance
  SELECT * INTO v_balance FROM credit_balances WHERE member_id = p_member_id;
  IF NOT FOUND OR v_balance.current_balance < v_reward.cost_credits THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Create credit transaction
  INSERT INTO credit_transactions (member_id, type, amount, balance_after, reason, category)
  VALUES (
    p_member_id,
    'REWARD_REDEMPTION',
    -v_reward.cost_credits,
    v_balance.current_balance - v_reward.cost_credits,
    'Redeemed: ' || v_reward.name,
    'REWARDS'
  )
  RETURNING id INTO v_transaction_id;

  -- Update credit balance
  UPDATE credit_balances SET
    current_balance = current_balance - v_reward.cost_credits,
    lifetime_spent = lifetime_spent + v_reward.cost_credits,
    updated_at = now()
  WHERE member_id = p_member_id;

  -- Create redemption record
  INSERT INTO reward_redemptions (reward_id, member_id, credit_transaction_id, status)
  VALUES (p_reward_id, p_member_id, v_transaction_id, 'PENDING')
  RETURNING id INTO v_redemption_id;

  -- Decrease quantity if limited
  IF v_reward.quantity IS NOT NULL THEN
    UPDATE reward_items SET
      quantity = quantity - 1,
      status = CASE WHEN quantity - 1 <= 0 THEN 'OUT_OF_STOCK' ELSE status END,
      updated_at = now()
    WHERE id = p_reward_id;
  END IF;

  RETURN json_build_object(
    'redemption_id', v_redemption_id,
    'transaction_id', v_transaction_id,
    'credits_deducted', v_reward.cost_credits,
    'new_balance', v_balance.current_balance - v_reward.cost_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SCHEDULED JOB FUNCTIONS
-- ============================================

-- Generate daily chore instances from schedules
CREATE OR REPLACE FUNCTION generate_daily_chore_instances()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_schedule RECORD;
  v_member_id UUID;
  v_today DATE := CURRENT_DATE;
  v_day_of_week INT := EXTRACT(DOW FROM CURRENT_DATE)::INT;
BEGIN
  FOR v_schedule IN
    SELECT cs.*, cd.family_id
    FROM chore_schedules cs
    JOIN chore_definitions cd ON cd.id = cs.chore_definition_id
    WHERE cs.is_active = true
      AND cd.is_active = true
      AND (
        cs.frequency = 'DAILY'
        OR (cs.frequency = 'WEEKLY' AND cs.day_of_week = v_day_of_week)
      )
  LOOP
    -- Get assigned members
    FOR v_member_id IN
      SELECT member_id FROM chore_assignments
      WHERE chore_schedule_id = v_schedule.id
        AND is_active = true
    LOOP
      -- Check if instance already exists for today
      IF NOT EXISTS (
        SELECT 1 FROM chore_instances
        WHERE chore_schedule_id = v_schedule.id
          AND assigned_to_id = v_member_id
          AND due_date::DATE = v_today
      ) THEN
        INSERT INTO chore_instances (chore_schedule_id, assigned_to_id, due_date, status)
        VALUES (v_schedule.id, v_member_id, v_today, 'PENDING');
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset weekly screen time balances
CREATE OR REPLACE FUNCTION reset_weekly_screen_time()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_setting RECORD;
  v_rollover_amount INT;
BEGIN
  FOR v_setting IN
    SELECT sts.*, stb.current_balance_minutes
    FROM screen_time_settings sts
    LEFT JOIN screen_time_balances stb ON stb.member_id = sts.member_id
    WHERE sts.is_active = true
  LOOP
    -- Calculate rollover
    v_rollover_amount := 0;
    IF v_setting.rollover_type = 'FULL' THEN
      v_rollover_amount := COALESCE(v_setting.current_balance_minutes, 0);
    ELSIF v_setting.rollover_type = 'CAPPED' AND v_setting.rollover_cap_minutes IS NOT NULL THEN
      v_rollover_amount := LEAST(
        COALESCE(v_setting.current_balance_minutes, 0),
        v_setting.rollover_cap_minutes
      );
    END IF;

    -- Update or insert balance
    INSERT INTO screen_time_balances (member_id, current_balance_minutes, week_start_date)
    VALUES (
      v_setting.member_id,
      v_setting.weekly_allocation_minutes + v_rollover_amount,
      DATE_TRUNC('week', CURRENT_DATE)
    )
    ON CONFLICT (member_id) DO UPDATE SET
      current_balance_minutes = v_setting.weekly_allocation_minutes + v_rollover_amount,
      week_start_date = DATE_TRUNC('week', CURRENT_DATE),
      updated_at = now();

    -- Log the allocation transaction
    INSERT INTO screen_time_transactions (
      member_id, type, amount_minutes, balance_after, created_by_id, reason
    )
    VALUES (
      v_setting.member_id,
      'ALLOCATION',
      v_setting.weekly_allocation_minutes,
      v_setting.weekly_allocation_minutes + v_rollover_amount,
      v_setting.member_id,
      'Weekly reset'
    );

    -- Log rollover if any
    IF v_rollover_amount > 0 THEN
      INSERT INTO screen_time_transactions (
        member_id, type, amount_minutes, balance_after, created_by_id, reason
      )
      VALUES (
        v_setting.member_id,
        'ROLLOVER',
        v_rollover_amount,
        v_setting.weekly_allocation_minutes + v_rollover_amount,
        v_setting.member_id,
        'Rolled over from previous week'
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
