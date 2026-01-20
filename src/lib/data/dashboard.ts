import { createClient } from '@/lib/supabase/server'

/**
 * Get dashboard layout for a member
 */
export async function getDashboardLayout(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error

  // Return default layout if none exists
  if (!data) {
    return {
      member_id: memberId,
      layout: null,
      widgets: [],
    }
  }

  return data
}

/**
 * Update dashboard layout for a member
 */
export async function updateDashboardLayout(
  memberId: string,
  updates: {
    layout?: any
    widgets?: any[]
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .upsert({
      member_id: memberId,
      layout: updates.layout,
      widgets: updates.widgets || [],
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Reset dashboard layout to default
 */
export async function resetDashboardLayout(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .update({
      layout: null,
      widgets: [],
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}
