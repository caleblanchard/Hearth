import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type CreditBalance = Database['public']['Tables']['credit_balances']['Row']
type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
type RewardItem = Database['public']['Tables']['reward_items']['Row']
type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row']

/**
 * Get credit balance for a member
 */
export async function getCreditBalance(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('credit_balances')
    .select('*')
    .eq('member_id', memberId)
    .single()

  if (error) {
    // If no balance exists, create one with 0 balance
    const { data: newBalance, error: insertError } = await supabase
      .from('credit_balances')
      .insert({
        member_id: memberId,
        current_balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newBalance
  }

  return data
}

/**
 * Get credit transaction history for a member
 */
export async function getCreditTransactions(
  memberId: string,
  options: {
    limit?: number
    type?: CreditTransaction['type']
    category?: CreditTransaction['category']
  } = {}
) {
  const supabase = await createClient()

  let query = supabase
    .from('credit_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.type) {
    query = query.eq('type', options.type)
  }

  if (options.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Award credits to a member
 */
export async function awardCredits(
  memberId: string,
  amount: number,
  reason: string,
  options: {
    adjustedById?: string
    relatedChoreInstanceId?: string
  } = {}
) {
  const supabase = await createClient()

  // Get current balance
  const balance = await getCreditBalance(memberId)
  const newBalance = balance.current_balance + amount

  // Update balance
  await supabase
    .from('credit_balances')
    .update({
      current_balance: newBalance,
      lifetime_earned: balance.lifetime_earned + amount,
    })
    .eq('member_id', memberId)

  // Create transaction
  const { data, error } = await supabase
    .from('credit_transactions')
    .insert({
      member_id: memberId,
      type: 'BONUS',
      amount: amount,
      balance_after: newBalance,
      reason: reason,
      category: 'OTHER',
      adjusted_by_id: options.adjustedById,
      related_chore_instance_id: options.relatedChoreInstanceId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Deduct credits from a member
 */
export async function deductCredits(
  memberId: string,
  amount: number,
  reason: string,
  category: CreditTransaction['category'] = 'OTHER',
  options: {
    adjustedById?: string
  } = {}
) {
  const supabase = await createClient()

  // Get current balance
  const balance = await getCreditBalance(memberId)

  if (balance.current_balance < amount) {
    throw new Error('Insufficient credits')
  }

  const newBalance = balance.current_balance - amount

  // Update balance
  await supabase
    .from('credit_balances')
    .update({
      current_balance: newBalance,
      lifetime_spent: balance.lifetime_spent + amount,
    })
    .eq('member_id', memberId)

  // Create transaction
  const { data, error } = await supabase
    .from('credit_transactions')
    .insert({
      member_id: memberId,
      type: 'ADJUSTMENT',
      amount: -amount,
      balance_after: newBalance,
      reason: reason,
      category: category,
      adjusted_by_id: options.adjustedById,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all reward items for a family
 */
export async function getRewardItems(familyId: string, activeOnly = true) {
  const supabase = await createClient()

  let query = supabase
    .from('reward_items')
    .select('*')
    .eq('family_id', familyId)
    .order('cost_credits')

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE')
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Create a reward item
 */
export async function createRewardItem(
  familyId: string,
  createdById: string,
  reward: Omit<RewardItem, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by_id'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reward_items')
    .insert({
      ...reward,
      family_id: familyId,
      created_by_id: createdById,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a reward item
 */
export async function updateRewardItem(
  rewardId: string,
  updates: Partial<Omit<RewardItem, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by_id'>>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reward_items')
    .update(updates)
    .eq('id', rewardId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Redeem a reward using the RPC function (atomic deduction)
 */
export async function redeemReward(rewardId: string, memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('redeem_reward', {
    p_reward_id: rewardId,
    p_member_id: memberId,
  })

  if (error) throw error
  return data
}

/**
 * Get redemptions for a member
 */
export async function getMemberRedemptions(
  memberId: string,
  options: {
    status?: RewardRedemption['status']
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  let query = supabase
    .from('reward_redemptions')
    .select(`
      *,
      reward:reward_items(*),
      approved_by:family_members!reward_redemptions_approved_by_id_fkey(id, name),
      rejected_by:family_members!reward_redemptions_rejected_by_id_fkey(id, name),
      fulfilled_by:family_members!reward_redemptions_fulfilled_by_id_fkey(id, name)
    `)
    .eq('member_id', memberId)
    .order('requested_at', { ascending: false })

  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get all pending redemptions for a family (for parents to approve)
 */
export async function getPendingRedemptions(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(`
      *,
      reward:reward_items!inner(*),
      member:family_members!reward_redemptions_member_id_fkey(id, name, avatar_url)
    `)
    .eq('reward.family_id', familyId)
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Approve a reward redemption
 */
export async function approveRedemption(
  redemptionId: string,
  approvedById: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reward_redemptions')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by_id: approvedById,
    })
    .eq('id', redemptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Reject a reward redemption (refund credits)
 */
export async function rejectRedemption(
  redemptionId: string,
  rejectedById: string,
  reason: string
) {
  const supabase = await createClient()

  // Get the redemption details
  const { data: redemption } = await supabase
    .from('reward_redemptions')
    .select('*, reward:reward_items(*), credit_transaction:credit_transactions(*)')
    .eq('id', redemptionId)
    .single()

  if (!redemption) {
    throw new Error('Redemption not found')
  }

  // Refund the credits
  if (redemption.reward && redemption.credit_transaction) {
    const balance = await getCreditBalance(redemption.member_id)
    const refundAmount = redemption.reward.cost_credits

    await supabase
      .from('credit_balances')
      .update({
        current_balance: balance.current_balance + refundAmount,
        lifetime_spent: balance.lifetime_spent - refundAmount,
      })
      .eq('member_id', redemption.member_id)

    // Create refund transaction
    await supabase
      .from('credit_transactions')
      .insert({
        member_id: redemption.member_id,
        type: 'ADJUSTMENT',
        amount: refundAmount,
        balance_after: balance.current_balance + refundAmount,
        reason: `Refund for rejected reward: ${reason}`,
        category: 'REWARDS',
        adjusted_by_id: rejectedById,
      })
  }

  // Update redemption status
  const { data, error } = await supabase
    .from('reward_redemptions')
    .update({
      status: 'REJECTED',
      rejected_at: new Date().toISOString(),
      rejected_by_id: rejectedById,
      rejection_reason: reason,
    })
    .eq('id', redemptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark a redemption as fulfilled
 */
export async function fulfillRedemption(
  redemptionId: string,
  fulfilledById: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reward_redemptions')
    .update({
      status: 'FULFILLED',
      fulfilled_at: new Date().toISOString(),
      fulfilled_by_id: fulfilledById,
    })
    .eq('id', redemptionId)
    .select()
    .single()

  if (error) throw error
  return data
}
