-- Fix race condition in redeem_reward by using SELECT ... FOR UPDATE
-- This ensures the reward stock and credit balance are locked within the transaction,
-- preventing concurrent redemptions from overdrafting credits or overselling limited items.

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
  -- Lock reward row first to prevent concurrent stock depletion
  SELECT * INTO v_reward FROM reward_items WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  IF v_reward.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Reward is not available';
  END IF;

  IF v_reward.quantity IS NOT NULL AND v_reward.quantity <= 0 THEN
    RAISE EXCEPTION 'Reward is out of stock';
  END IF;

  -- Lock balance row to prevent concurrent overdraft
  SELECT * INTO v_balance FROM credit_balances WHERE member_id = p_member_id FOR UPDATE;
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

  -- Update credit balance atomically (lock is already held)
  UPDATE credit_balances SET
    current_balance = current_balance - v_reward.cost_credits,
    lifetime_spent = lifetime_spent + v_reward.cost_credits,
    updated_at = now()
  WHERE member_id = p_member_id;

  -- Create redemption record
  INSERT INTO reward_redemptions (reward_id, member_id, credit_transaction_id, status)
  VALUES (p_reward_id, p_member_id, v_transaction_id, 'PENDING')
  RETURNING id INTO v_redemption_id;

  -- Decrement quantity if the reward has a limited supply (lock is already held)
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
    'new_balance', v_balance.current_balance - v_reward.cost_credits,
    'redemption', json_build_object(
      'id', v_redemption_id,
      'reward_id', p_reward_id,
      'member_id', p_member_id,
      'status', 'PENDING',
      'requested_at', now(),
      'reward', row_to_json(v_reward)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
