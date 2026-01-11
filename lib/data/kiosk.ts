import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import bcrypt from 'bcrypt'

type KioskSession = Database['public']['Tables']['kiosk_sessions']['Row']
type KioskSessionInsert = Database['public']['Tables']['kiosk_sessions']['Insert']
type KioskSessionUpdate = Database['public']['Tables']['kiosk_sessions']['Update']
type KioskSettings = Database['public']['Tables']['kiosk_settings']['Row']
type KioskSettingsUpdate = Database['public']['Tables']['kiosk_settings']['Update']

/**
 * Create a new kiosk session for a device
 * If session already exists for device, reactivates it
 */
export async function createKioskSession(
  deviceId: string,
  familyId: string
): Promise<KioskSession> {
  const supabase = await createClient()

  // Check if session already exists for this device
  const { data: existingSession } = await supabase
    .from('kiosk_sessions')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  if (existingSession && existingSession.is_active) {
    // Reactivate existing session
    const { data, error } = await supabase
      .from('kiosk_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        current_member_id: null, // Start locked
      })
      .eq('id', existingSession.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Create new session
  const { data, error } = await supabase
    .from('kiosk_sessions')
    .insert({
      family_id: familyId,
      device_id: deviceId,
      current_member_id: null, // Start locked
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get kiosk session by session token
 */
export async function getKioskSession(
  sessionToken: string
): Promise<KioskSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .select(`
      *,
      current_member:family_members!current_member_id(
        id,
        name,
        role,
        avatar_url
      )
    `)
    .eq('session_token', sessionToken)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data
}

/**
 * Get kiosk session by device ID
 */
export async function getKioskSessionByDevice(
  deviceId: string
): Promise<KioskSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data
}

/**
 * Update last activity timestamp for kiosk session
 */
export async function updateKioskActivity(
  sessionToken: string
): Promise<KioskSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
    })
    .eq('session_token', sessionToken)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Lock kiosk session (clear current member)
 */
export async function lockKioskSession(
  sessionToken: string
): Promise<KioskSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .update({
      current_member_id: null,
    })
    .eq('session_token', sessionToken)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Unlock kiosk session with member PIN
 */
export async function unlockKioskSession(
  sessionToken: string,
  memberId: string,
  pin: string
): Promise<{ success: boolean; session?: KioskSession; error?: string }> {
  const supabase = await createClient()

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('kiosk_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single()

  if (sessionError || !session) {
    return { success: false, error: 'Session not found' }
  }

  // Get member
  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('id, family_id, pin')
    .eq('id', memberId)
    .single()

  if (memberError || !member) {
    return { success: false, error: 'Member not found' }
  }

  // Verify family ownership
  if (member.family_id !== session.family_id) {
    return { success: false, error: 'Member not in session family' }
  }

  // Verify PIN
  if (!member.pin) {
    return { success: false, error: 'Member has no PIN set' }
  }

  const pinMatch = await bcrypt.compare(pin, member.pin)
  if (!pinMatch) {
    return { success: false, error: 'Invalid PIN' }
  }

  // Update session
  const { data: updatedSession, error: updateError } = await supabase
    .from('kiosk_sessions')
    .update({
      current_member_id: memberId,
      last_activity_at: new Date().toISOString(),
    })
    .eq('session_token', sessionToken)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: 'Failed to update session' }
  }

  return { success: true, session: updatedSession }
}

/**
 * End kiosk session (mark as inactive)
 */
export async function endKioskSession(
  sessionToken: string
): Promise<KioskSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .update({
      is_active: false,
      current_member_id: null,
    })
    .eq('session_token', sessionToken)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check if session should auto-lock based on inactivity
 */
export function checkAutoLock(session: KioskSession): boolean {
  const now = new Date()
  const lastActivity = new Date(session.last_activity_at)
  const timeoutMs = session.auto_lock_minutes * 60 * 1000
  const timeSinceActivity = now.getTime() - lastActivity.getTime()

  return timeSinceActivity >= timeoutMs
}

/**
 * Get kiosk settings for family (or create defaults)
 */
export async function getOrCreateKioskSettings(
  familyId: string
): Promise<KioskSettings> {
  const supabase = await createClient()

  // Try to get existing settings
  const { data: existing } = await supabase
    .from('kiosk_settings')
    .select('*')
    .eq('family_id', familyId)
    .single()

  if (existing) {
    return existing
  }

  // Create default settings
  const { data, error } = await supabase
    .from('kiosk_settings')
    .insert({
      family_id: familyId,
      is_enabled: true,
      auto_lock_minutes: 15,
      enabled_widgets: ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
      allow_guest_view: true,
      require_pin_for_switch: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update kiosk settings for a family
 */
export async function updateKioskSettings(
  familyId: string,
  updates: KioskSettingsUpdate
): Promise<KioskSettings> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_settings')
    .update(updates)
    .eq('family_id', familyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get active kiosk sessions for a family
 */
export async function getActiveFamilySessions(
  familyId: string
): Promise<KioskSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kiosk_sessions')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}
