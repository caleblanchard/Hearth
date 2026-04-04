-- Fix complete_chore_with_credits: cast string literals to chore_status enum
-- PostgreSQL requires explicit casts when assigning text to an enum column in PL/pgSQL.

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

  IF v_instance.status != 'PENDING'::chore_status THEN
    RAISE EXCEPTION 'Chore is not in pending status';
  END IF;

  -- Get schedule and definition
  SELECT * INTO v_schedule FROM chore_schedules WHERE id = v_instance.chore_schedule_id;
  SELECT * INTO v_definition FROM chore_definitions WHERE id = v_schedule.chore_definition_id;

  v_credit_value := v_definition.credit_value;
  v_family_id := v_definition.family_id;

  -- Update the chore instance (cast literals to chore_status enum)
  UPDATE chore_instances SET
    status = CASE WHEN v_schedule.requires_approval THEN 'COMPLETED'::chore_status ELSE 'APPROVED'::chore_status END,
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
    'success', true,
    'instance_id', p_instance_id,
    'credits_awarded', CASE WHEN NOT v_schedule.requires_approval THEN v_credit_value ELSE 0 END,
    'requires_approval', v_schedule.requires_approval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
