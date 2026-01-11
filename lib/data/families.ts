import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Family = Database['public']['Tables']['families']['Row']
type FamilyInsert = Database['public']['Tables']['families']['Insert']
type FamilyUpdate = Database['public']['Tables']['families']['Update']

/**
 * Get a family by ID
 */
export async function getFamily(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get a family with its members
 */
export async function getFamilyWithMembers(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('families')
    .select(`
      *,
      members:family_members(
        id,
        name,
        role,
        avatar_url,
        birth_date,
        is_active
      )
    `)
    .eq('id', familyId)
    .eq('members.is_active', true)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all families the current user belongs to
 */
export async function getUserFamilies() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('families')
    .select(`
      *,
      members!inner(
        id,
        name,
        role,
        avatar_url
      )
    `)
    .eq('members.auth_user_id', user.id)
    .eq('members.is_active', true)

  if (error) throw error
  return data
}

/**
 * Create a new family
 */
export async function createFamily(family: FamilyInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('families')
    .insert(family)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a family
 */
export async function updateFamily(
  familyId: string,
  updates: FamilyUpdate
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', familyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get family settings
 */
export async function getFamilySettings(familyId: string) {
  const family = await getFamily(familyId)
  return family.settings as Record<string, unknown> || {}
}

/**
 * Update family settings (merge with existing)
 */
export async function updateFamilySettings(
  familyId: string,
  settings: Record<string, unknown>
) {
  const currentSettings = await getFamilySettings(familyId)
  const mergedSettings = { ...currentSettings, ...settings }

  return updateFamily(familyId, { settings: mergedSettings })
}

/**
 * Get module configurations for a family
 */
export async function getModuleConfigurations(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('module_configurations')
    .select('*')
    .eq('family_id', familyId)

  if (error) throw error
  return data || []
}

/**
 * Check if a module is enabled for a family
 */
export async function isModuleEnabled(
  familyId: string,
  moduleId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('module_configurations')
    .select('is_enabled')
    .eq('family_id', familyId)
    .eq('module_id', moduleId)
    .single()

  return data?.is_enabled ?? true // Default to enabled if not configured
}

/**
 * Enable or disable a module for a family
 */
export async function setModuleEnabled(
  familyId: string,
  moduleId: string,
  isEnabled: boolean
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('module_configurations')
    .upsert({
      family_id: familyId,
      module_id: moduleId,
      is_enabled: isEnabled,
      [isEnabled ? 'enabled_at' : 'disabled_at']: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}
