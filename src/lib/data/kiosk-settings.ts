import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export type KioskSettings = Database['public']['Tables']['kiosk_settings']['Row']
export type KioskSettingsUpdate = Database['public']['Tables']['kiosk_settings']['Update']

export async function getOrCreateKioskSettings(familyId: string): Promise<KioskSettings> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('kiosk_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return existing

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
