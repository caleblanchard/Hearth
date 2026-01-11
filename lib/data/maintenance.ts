import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type MaintenanceItem = Database['public']['Tables']['maintenance_items']['Row']
type MaintenanceItemInsert = Database['public']['Tables']['maintenance_items']['Insert']
type MaintenanceItemUpdate = Database['public']['Tables']['maintenance_items']['Update']
type MaintenanceCompletion = Database['public']['Tables']['maintenance_completions']['Row']
type MaintenanceCompletionInsert = Database['public']['Tables']['maintenance_completions']['Insert']

/**
 * ============================================
 * MAINTENANCE ITEMS
 * ============================================
 */

/**
 * Get maintenance items for a family
 */
export async function getMaintenanceItems(
  familyId: string,
  options?: {
    category?: string
    overdue?: boolean
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('maintenance_items')
    .select('*')
    .eq('family_id', familyId)

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.overdue) {
    const now = new Date().toISOString()
    query = query.lte('next_due_at', now)
  }

  query = query.order('next_due_at', { ascending: true, nullsFirst: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get overdue maintenance items
 */
export async function getOverdueMaintenanceItems(familyId: string) {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('maintenance_items')
    .select('*')
    .eq('family_id', familyId)
    .lte('next_due_at', now)
    .order('next_due_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get upcoming maintenance (next 30 days)
 */
export async function getUpcomingMaintenance(familyId: string, days = 30) {
  const supabase = await createClient()

  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  const { data, error } = await supabase
    .from('maintenance_items')
    .select('*')
    .eq('family_id', familyId)
    .gte('next_due_at', now.toISOString())
    .lte('next_due_at', future.toISOString())
    .order('next_due_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Create maintenance item
 */
export async function createMaintenanceItem(
  item: MaintenanceItemInsert
): Promise<MaintenanceItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maintenance_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update maintenance item
 */
export async function updateMaintenanceItem(
  itemId: string,
  updates: MaintenanceItemUpdate
): Promise<MaintenanceItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maintenance_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete maintenance item
 */
export async function deleteMaintenanceItem(itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('maintenance_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * ============================================
 * MAINTENANCE COMPLETIONS
 * ============================================
 */

/**
 * Record maintenance completion
 */
export async function recordMaintenanceCompletion(
  completion: MaintenanceCompletionInsert
): Promise<MaintenanceCompletion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maintenance_completions')
    .insert(completion)
    .select()
    .single()

  if (error) throw error

  // Update the maintenance item's last completed and next due dates
  // This should be done in a transaction ideally
  const item = await supabase
    .from('maintenance_items')
    .select('frequency')
    .eq('id', completion.maintenance_item_id)
    .single()

  if (item.data) {
    // Calculate next due date based on frequency
    const nextDue = calculateNextDueDate(new Date(), item.data.frequency)
    
    await supabase
      .from('maintenance_items')
      .update({
        last_completed_at: completion.completed_at,
        next_due_at: nextDue.toISOString(),
      })
      .eq('id', completion.maintenance_item_id)
  }

  return data
}

/**
 * Get maintenance completion history
 */
export async function getMaintenanceCompletions(
  itemId: string,
  limit = 10
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maintenance_completions')
    .select(`
      *,
      completed_by_member:family_members(id, name)
    `)
    .eq('maintenance_item_id', itemId)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Helper: Calculate next due date based on frequency
 */
function calculateNextDueDate(from: Date, frequency: string): Date {
  const nextDue = new Date(from)
  
  // Parse frequency (e.g., "1_MONTH", "3_MONTHS", "6_MONTHS", "1_YEAR")
  const match = frequency.match(/(\d+)_(DAY|WEEK|MONTH|YEAR)S?/)
  if (!match) return nextDue

  const [, amount, unit] = match
  const num = parseInt(amount)

  switch (unit) {
    case 'DAY':
      nextDue.setDate(nextDue.getDate() + num)
      break
    case 'WEEK':
      nextDue.setDate(nextDue.getDate() + num * 7)
      break
    case 'MONTH':
      nextDue.setMonth(nextDue.getMonth() + num)
      break
    case 'YEAR':
      nextDue.setFullYear(nextDue.getFullYear() + num)
      break
  }

  return nextDue
}

/**
 * Get a single maintenance item
 */
export async function getMaintenanceItem(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maintenance_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error) throw error
  return data
}

/**
 * Complete maintenance item
 */
export async function completeMaintenanceItem(
  itemId: string,
  completedBy: string,
  notes?: string
) {
  return recordMaintenanceCompletion(itemId, completedBy, notes)
}

/**
 * Get upcoming maintenance items
 */
export async function getUpcomingMaintenanceItems(familyId: string, days = 30) {
  return getUpcomingMaintenance(familyId, days)
}
