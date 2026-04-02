import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type LeaderboardEntry = Database['public']['Tables']['leaderboard_entries']['Row']

/**
 * ============================================
 * LEADERBOARD
 * ============================================
 */

/**
 * Get leaderboard for a period
 */
export async function getLeaderboard(
  familyId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select(`
      *,
      user:family_members(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .eq('period', period)
    .eq('period_key', periodKey)
    .order('rank', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get member's leaderboard entry
 */
export async function getMemberLeaderboardEntry(
  memberId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', memberId)
    .eq('period', period)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Update leaderboard entry
 */
export async function updateLeaderboardEntry(
  familyId: string,
  memberId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
  scoreChange: number
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  // Get or create entry
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id, score')
    .eq('family_id', familyId)
    .eq('user_id', memberId)
    .eq('period', period)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .update({
        score: existing.score + scoreChange,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .insert({
        family_id: familyId,
        user_id: memberId,
        period,
        period_key: periodKey,
        score: scoreChange,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Recalculate ranks for a period
 */
export async function recalculateRanks(
  familyId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  // Get all entries for this period, sorted by score
  const { data: entries, error } = await supabase
    .from('leaderboard_entries')
    .select('id, score')
    .eq('family_id', familyId)
    .eq('period', period)
    .eq('period_key', periodKey)
    .order('score', { ascending: false })

  if (error) throw error
  if (!entries || entries.length === 0) return

  // Update ranks
  const updates = entries.map((entry, index) =>
    supabase
      .from('leaderboard_entries')
      .update({ rank: index + 1 })
      .eq('id', entry.id)
  )

  await Promise.all(updates)
}

/**
 * Get top performers for period
 */
export async function getTopPerformers(
  familyId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
  limit = 10
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select(`
      *,
      user:family_members(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .eq('period', period)
    .eq('period_key', periodKey)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Reset leaderboard for period
 */
export async function resetLeaderboard(
  familyId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
) {
  const supabase = await createClient()

  const periodKey = getPeriodKey(period)

  const { error } = await supabase
    .from('leaderboard_entries')
    .delete()
    .eq('family_id', familyId)
    .eq('period', period)
    .eq('period_key', periodKey)

  if (error) throw error
}

/**
 * Helper: Get period key for current time
 */
function getPeriodKey(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'): string {
  const now = new Date()

  switch (period) {
    case 'DAILY':
      return now.toISOString().split('T')[0] // YYYY-MM-DD
    case 'WEEKLY': {
      const weekStart = new Date(now)
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
      weekStart.setDate(diff)
      return weekStart.toISOString().split('T')[0]
    }
    case 'MONTHLY':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    case 'ALL_TIME':
      return 'all_time'
  }
}

/**
 * Get leaderboard history for member
 */
export async function getMemberLeaderboardHistory(
  memberId: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  limit = 30
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('period_key, score, rank')
    .eq('user_id', memberId)
    .eq('period', period)
    .order('period_key', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
