import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type MedicalProfile = Database['public']['Tables']['medical_profiles']['Row']
type MedicalProfileInsert = Database['public']['Tables']['medical_profiles']['Insert']
type MedicalProfileUpdate = Database['public']['Tables']['medical_profiles']['Update']
type HealthEvent = Database['public']['Tables']['health_events']['Row']
type HealthEventInsert = Database['public']['Tables']['health_events']['Insert']

/**
 * ============================================
 * MEDICAL PROFILES
 * ============================================
 */

/**
 * Get medical profile for a member
 */
export async function getMedicalProfile(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('medical_profiles')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create or update medical profile
 */
export async function upsertMedicalProfile(
  memberId: string,
  profile: Partial<MedicalProfileInsert>
): Promise<MedicalProfile> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('medical_profiles')
    .select('id')
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('medical_profiles')
      .update(profile)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('medical_profiles')
      .insert({
        member_id: memberId,
        ...profile,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * ============================================
 * HEALTH EVENTS
 * ============================================
 */

/**
 * Get health events for a member
 */
export async function getHealthEvents(
  memberId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('health_events')
    .select(`
      *,
      member:family_members(id, name),
      recorded_by_member:family_members!health_events_recorded_by_fkey(id, name)
    `)
    .eq('member_id', memberId)

  if (startDate) {
    query = query.gte('event_date', startDate)
  }
  if (endDate) {
    query = query.lte('event_date', endDate)
  }

  query = query.order('event_date', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Create health event
 */
export async function createHealthEvent(
  event: HealthEventInsert
): Promise<HealthEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_events')
    .insert(event)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update health event
 */
export async function updateHealthEvent(
  eventId: string,
  updates: Partial<HealthEventInsert>
): Promise<HealthEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete health event
 */
export async function deleteHealthEvent(eventId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('health_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}

/**
 * Get recent health events for family
 */
export async function getFamilyHealthEvents(familyId: string, days = 30) {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data, error } = await supabase
    .from('health_events')
    .select(`
      *,
      member:family_members!inner(id, name, family_id)
    `)
    .eq('member.family_id', familyId)
    .gte('event_date', cutoff.toISOString())
    .order('event_date', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * HEALTH EVENT MEDICATIONS
 * ============================================
 */

/**
 * Add medication to a health event
 */
export async function addMedicationToHealthEvent(
  eventId: string,
  recordedBy: string,
  medicationData: {
    medicationName: string
    dosage: string
    givenAt?: string
    notes?: string
  }
) {
  const supabase = await createClient()

  // Get event details for audit log
  const { data: event } = await supabase
    .from('health_events')
    .select(`
      *,
      member:family_members(id, name, family_id)
    `)
    .eq('id', eventId)
    .single()

  if (!event) throw new Error('Health event not found')

  const { data, error} = await supabase
    .from('health_event_medications')
    .insert({
      health_event_id: eventId,
      medication_name: medicationData.medicationName,
      dosage: medicationData.dosage,
      given_at: medicationData.givenAt || new Date().toISOString(),
      notes: medicationData.notes,
      recorded_by: recordedBy,
    })
    .select()
    .single()

  if (error) throw error

  // Create audit log
  await supabase.from('audit_logs').insert({
    family_id: event.member.family_id,
    member_id: recordedBy,
    action: 'HEALTH_EVENT_MEDICATION_ADDED',
    details: {
      event_id: eventId,
      member_id: event.member_id,
      member_name: event.member.name,
      medication_name: medicationData.medicationName,
    },
  })

  return data
}
