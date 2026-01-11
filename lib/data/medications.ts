import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type HealthMedication = Database['public']['Tables']['health_medications']['Row']
type HealthMedicationInsert = Database['public']['Tables']['health_medications']['Insert']
type HealthMedicationUpdate = Database['public']['Tables']['health_medications']['Update']
type MedicationDose = Database['public']['Tables']['medication_doses']['Row']
type MedicationDoseInsert = Database['public']['Tables']['medication_doses']['Insert']

/**
 * ============================================
 * MEDICATIONS
 * ============================================
 */

/**
 * Get medications for a member
 */
export async function getMemberMedications(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_medications')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Get all active medications for family
 */
export async function getFamilyMedications(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_medications')
    .select(`
      *,
      member:family_members!inner(id, name, family_id)
    `)
    .eq('member.family_id', familyId)
    .eq('is_active', true)
    .order('member.name')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create medication
 */
export async function createMedication(
  medication: HealthMedicationInsert
): Promise<HealthMedication> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_medications')
    .insert(medication)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update medication
 */
export async function updateMedication(
  medicationId: string,
  updates: HealthMedicationUpdate
): Promise<HealthMedication> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_medications')
    .update(updates)
    .eq('id', medicationId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Deactivate medication
 */
export async function deactivateMedication(medicationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('health_medications')
    .update({ is_active: false })
    .eq('id', medicationId)

  if (error) throw error
}

/**
 * ============================================
 * MEDICATION DOSES
 * ============================================
 */

/**
 * Record medication dose
 */
export async function recordMedicationDose(
  dose: MedicationDoseInsert
): Promise<MedicationDose> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('medication_doses')
    .insert(dose)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get medication dose history
 */
export async function getMedicationDoses(
  medicationId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('medication_doses')
    .select(`
      *,
      given_by_member:family_members(id, name)
    `)
    .eq('medication_id', medicationId)

  if (startDate) {
    query = query.gte('given_at', startDate)
  }
  if (endDate) {
    query = query.lte('given_at', endDate)
  }

  query = query.order('given_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get today's doses for a member
 */
export async function getTodayDoses(memberId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('medication_doses')
    .select(`
      *,
      medication:health_medications!inner(id, name, member_id)
    `)
    .eq('medication.member_id', memberId)
    .gte('given_at', today.toISOString())
    .lt('given_at', tomorrow.toISOString())
    .order('given_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get upcoming medication schedule
 */
export async function getUpcomingMedications(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_medications')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .not('schedule', 'is', null)
    .order('name')

  if (error) throw error
  return data || []
}
