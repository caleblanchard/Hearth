import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type TransportSchedule = Database['public']['Tables']['transport_schedules']['Row']
type TransportScheduleInsert = Database['public']['Tables']['transport_schedules']['Insert']
type TransportScheduleUpdate = Database['public']['Tables']['transport_schedules']['Update']
type CarpoolGroup = Database['public']['Tables']['carpool_groups']['Row']
type CarpoolGroupInsert = Database['public']['Tables']['carpool_groups']['Insert']
type CarpoolMember = Database['public']['Tables']['carpool_members']['Row']

/**
 * ============================================
 * TRANSPORT SCHEDULES
 * ============================================
 */

/**
 * Get transport schedules for a family
 */
export async function getTransportSchedules(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transport_schedules')
    .select(`
      *,
      member:family_members(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('pickup_time')

  if (error) throw error
  return data || []
}

/**
 * Create transport schedule
 */
export async function createTransportSchedule(
  schedule: TransportScheduleInsert
): Promise<TransportSchedule> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transport_schedules')
    .insert(schedule)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update transport schedule
 */
export async function updateTransportSchedule(
  scheduleId: string,
  updates: TransportScheduleUpdate
): Promise<TransportSchedule> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transport_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete transport schedule
 */
export async function deleteTransportSchedule(scheduleId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transport_schedules')
    .update({ is_active: false })
    .eq('id', scheduleId)

  if (error) throw error
}

/**
 * ============================================
 * CARPOOL GROUPS
 * ============================================
 */

/**
 * Get carpool groups for a family
 */
export async function getCarpoolGroups(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('carpool_groups')
    .select(`
      *,
      members:carpool_members(
        id,
        role,
        family_member:family_members(id, name, avatar_url)
      )
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create carpool group
 */
export async function createCarpoolGroup(
  group: CarpoolGroupInsert
): Promise<CarpoolGroup> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('carpool_groups')
    .insert(group)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Add member to carpool
 */
export async function addCarpoolMember(
  carpoolId: string,
  memberId: string,
  role: 'DRIVER' | 'RIDER'
): Promise<CarpoolMember> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('carpool_members')
    .insert({
      carpool_group_id: carpoolId,
      family_member_id: memberId,
      role,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove member from carpool
 */
export async function removeCarpoolMember(carpoolMemberId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('carpool_members')
    .delete()
    .eq('id', carpoolMemberId)

  if (error) throw error
}
