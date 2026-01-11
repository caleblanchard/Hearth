import { createClient } from '@/lib/supabase/server'

/**
 * Update a family member
 */
export async function updateFamilyMember(
  memberId: string,
  updates: {
    name?: string
    email?: string
    role?: string
    avatar_url?: string | null
    birth_date?: string | null
    is_active?: boolean
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('family_members')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete (deactivate) a family member
 */
export async function deleteFamilyMember(memberId: string) {
  const supabase = await createClient()

  // Soft delete by setting is_active to false
  const { data, error } = await supabase
    .from('family_members')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get module access for a member
 */
export async function getMemberModuleAccess(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('member_module_access')
    .select('*')
    .eq('member_id', memberId)

  if (error) throw error
  return data || []
}

/**
 * Update module access for a member
 */
export async function updateMemberModuleAccess(
  memberId: string,
  modules: Array<{
    module_id: string
    has_access: boolean
  }>
) {
  const supabase = await createClient()

  // Delete existing access records
  await supabase
    .from('member_module_access')
    .delete()
    .eq('member_id', memberId)

  // Insert new access records
  if (modules.length > 0) {
    const { data, error } = await supabase
      .from('member_module_access')
      .insert(
        modules.map((m) => ({
          member_id: memberId,
          module_id: m.module_id,
          has_access: m.has_access,
        }))
      )
      .select()

    if (error) throw error
    return data || []
  }

  return []
}
