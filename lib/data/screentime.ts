import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type ScreenTimeType = Database['public']['Tables']['screen_time_types']['Row']
type ScreenTimeTypeInsert = Database['public']['Tables']['screen_time_types']['Insert']
type ScreenTimeAllowance = Database['public']['Tables']['screen_time_allowances']['Row']
type ScreenTimeAllowanceInsert = Database['public']['Tables']['screen_time_allowances']['Insert']
type ScreenTimeAllowanceUpdate = Database['public']['Tables']['screen_time_allowances']['Update']
type ScreenTimeSession = Database['public']['Tables']['screen_time_sessions']['Row']
type ScreenTimeSessionInsert = Database['public']['Tables']['screen_time_sessions']['Insert']
type ScreenTimeGrace = Database['public']['Tables']['screen_time_grace_periods']['Row']

/**
 * ============================================
 * SCREEN TIME TYPES
 * ============================================
 */

/**
 * Get all screen time types for a family
 */
export async function getScreenTimeTypes(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_types')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create a screen time type
 */
export async function createScreenTimeType(
  type: ScreenTimeTypeInsert
): Promise<ScreenTimeType> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_types')
    .insert(type)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a screen time type
 */
export async function updateScreenTimeType(
  typeId: string,
  updates: Partial<ScreenTimeType>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_types')
    .update(updates)
    .eq('id', typeId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a screen time type (soft delete)
 */
export async function deleteScreenTimeType(typeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('screen_time_types')
    .update({ is_active: false })
    .eq('id', typeId)

  if (error) throw error
}

/**
 * ============================================
 * SCREEN TIME ALLOWANCES
 * ============================================
 */

/**
 * Get allowances for a member
 */
export async function getMemberAllowances(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_allowances')
    .select(`
      *,
      screen_type:screen_time_types(id, name, color, icon)
    `)
    .eq('member_id', memberId)
    .order('screen_time_type_id')

  if (error) throw error
  return data || []
}

/**
 * Get or create allowance for a member and type
 */
export async function getOrCreateAllowance(
  memberId: string,
  screenTimeTypeId: string
): Promise<ScreenTimeAllowance> {
  const supabase = await createClient()

  // Try to find existing
  const { data: existing } = await supabase
    .from('screen_time_allowances')
    .select('*')
    .eq('member_id', memberId)
    .eq('screen_time_type_id', screenTimeTypeId)
    .maybeSingle()

  if (existing) return existing

  // Create new with default values
  const { data: newAllowance, error } = await supabase
    .from('screen_time_allowances')
    .insert({
      member_id: memberId,
      screen_time_type_id: screenTimeTypeId,
      daily_minutes: 60, // Default 1 hour
      remaining_minutes: 60,
    })
    .select()
    .single()

  if (error) throw error
  return newAllowance
}

/**
 * Update allowance
 */
export async function updateAllowance(
  allowanceId: string,
  updates: ScreenTimeAllowanceUpdate
): Promise<ScreenTimeAllowance> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_allowances')
    .update(updates)
    .eq('id', allowanceId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Reset daily allowances (called by cron)
 */
export async function resetDailyAllowances(familyId: string) {
  const supabase = await createClient()

  // Get all members in family
  const { data: members } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId)
    .eq('is_active', true)

  if (!members) return

  // Reset all allowances for these members
  const memberIds = members.map(m => m.id)
  
  const { error } = await supabase
    .from('screen_time_allowances')
    .update({
      remaining_minutes: supabase.sql`daily_minutes`,
      last_reset_at: new Date().toISOString(),
    })
    .in('member_id', memberIds)

  if (error) throw error
}

/**
 * ============================================
 * SCREEN TIME SESSIONS
 * ============================================
 */

/**
 * Start a screen time session
 */
export async function startScreenTimeSession(
  session: ScreenTimeSessionInsert
): Promise<ScreenTimeSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_sessions')
    .insert({
      ...session,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * End a screen time session
 */
export async function endScreenTimeSession(sessionId: string) {
  const supabase = await createClient()

  const now = new Date()

  // Get the session
  const { data: session } = await supabase
    .from('screen_time_sessions')
    .select('*, allowance:screen_time_allowances!inner(*)')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  const startedAt = new Date(session.started_at)
  const minutesUsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

  // Update session
  const { data: updatedSession, error: sessionError } = await supabase
    .from('screen_time_sessions')
    .update({
      ended_at: now.toISOString(),
      minutes_used: minutesUsed,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (sessionError) throw sessionError

  // Deduct from allowance
  const { error: allowanceError } = await supabase
    .from('screen_time_allowances')
    .update({
      remaining_minutes: Math.max(
        0,
        (session.allowance.remaining_minutes || 0) - minutesUsed
      ),
    })
    .eq('id', session.allowance_id)

  if (allowanceError) throw allowanceError

  return updatedSession
}

/**
 * Get active sessions for a member
 */
export async function getActiveSessions(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_sessions')
    .select(`
      *,
      allowance:screen_time_allowances!inner(
        *,
        screen_type:screen_time_types(name, color, icon)
      )
    `)
    .eq('allowance.member_id', memberId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get session history
 */
export async function getSessionHistory(
  memberId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_sessions')
    .select(`
      *,
      allowance:screen_time_allowances!inner(
        *,
        screen_type:screen_time_types(name, color, icon)
      )
    `)
    .eq('allowance.member_id', memberId)
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * GRACE PERIODS
 * ============================================
 */

/**
 * Request grace period
 */
export async function requestGracePeriod(
  allowanceId: string,
  requestedBy: string,
  minutes: number,
  reason: string
): Promise<ScreenTimeGrace> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_grace_periods')
    .insert({
      allowance_id: allowanceId,
      requested_by: requestedBy,
      minutes_requested: minutes,
      reason,
      status: 'PENDING',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Approve/deny grace period
 */
export async function respondToGraceRequest(
  graceId: string,
  approvedBy: string,
  approved: boolean
) {
  const supabase = await createClient()

  const { data: grace, error: updateError } = await supabase
    .from('screen_time_grace_periods')
    .update({
      status: approved ? 'APPROVED' : 'DENIED',
      approved_by: approvedBy,
      responded_at: new Date().toISOString(),
    })
    .eq('id', graceId)
    .select()
    .single()

  if (updateError) throw updateError

  // If approved, add minutes to allowance
  if (approved) {
    const { error: allowanceError } = await supabase
      .from('screen_time_allowances')
      .update({
        remaining_minutes: supabase.sql`remaining_minutes + ${grace.minutes_requested}`,
      })
      .eq('id', grace.allowance_id)

    if (allowanceError) throw allowanceError
  }

  return grace
}

/**
 * Get pending grace requests for a family
 */
export async function getPendingGraceRequests(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('screen_time_grace_periods')
    .select(`
      *,
      allowance:screen_time_allowances!inner(
        *,
        member:family_members!inner(id, name, avatar_url, family_id),
        screen_type:screen_time_types(name, color)
      ),
      requester:family_members!screen_time_grace_periods_requested_by_fkey(name)
    `)
    .eq('allowance.member.family_id', familyId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * STATISTICS
 * ============================================
 */

/**
 * Get screen time usage stats
 */
export async function getScreenTimeStats(
  memberId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('screen_time_sessions')
    .select(`
      minutes_used,
      started_at,
      allowance:screen_time_allowances!inner(
        screen_time_type_id,
        screen_type:screen_time_types(name)
      )
    `)
    .eq('allowance.member_id', memberId)
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .not('ended_at', 'is', null)

  if (error) throw error

  const totalMinutes = (sessions || []).reduce(
    (sum, s) => sum + (s.minutes_used || 0),
    0
  )

  // Group by type
  const byType = (sessions || []).reduce((acc, s) => {
    const typeName = s.allowance?.screen_type?.name || 'Unknown'
    if (!acc[typeName]) {
      acc[typeName] = 0
    }
    acc[typeName] += s.minutes_used || 0
    return acc
  }, {} as Record<string, number>)

  return {
    totalMinutes,
    byType,
    sessionCount: sessions?.length || 0,
  }
}
