import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Routine = Database['public']['Tables']['routines']['Row']
type RoutineInsert = Database['public']['Tables']['routines']['Insert']
type RoutineUpdate = Database['public']['Tables']['routines']['Update']
type RoutineItem = Database['public']['Tables']['routine_items']['Row']
type RoutineItemInsert = Database['public']['Tables']['routine_items']['Insert']
type RoutineItemUpdate = Database['public']['Tables']['routine_items']['Update']
type RoutineCompletion = Database['public']['Tables']['routine_completions']['Row']

/**
 * ============================================
 * ROUTINES
 * ============================================
 */

/**
 * Get all routines for a family
 */
export async function getRoutines(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      items:routine_items(*)
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('name')
    .order('sort_order', { foreignTable: 'items' })

  if (error) throw error
  return data || []
}

/**
 * Get a single routine with items
 */
export async function getRoutine(routineId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      items:routine_items(*),
      assigned_members:family_members!routines_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('id', routineId)
    .order('sort_order', { foreignTable: 'items' })
    .single()

  if (error) throw error
  return data
}

/**
 * Get routines assigned to a specific member
 */
export async function getMemberRoutines(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      items:routine_items(*)
    `)
    .eq('assigned_to', memberId)
    .eq('is_active', true)
    .order('name')
    .order('sort_order', { foreignTable: 'items' })

  if (error) throw error
  return data || []
}

/**
 * Create a routine
 */
export async function createRoutine(routine: RoutineInsert): Promise<Routine> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routines')
    .insert(routine)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a routine
 */
export async function updateRoutine(
  routineId: string,
  updates: RoutineUpdate
): Promise<Routine> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', routineId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a routine (soft delete)
 */
export async function deleteRoutine(routineId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('routines')
    .update({ is_active: false })
    .eq('id', routineId)

  if (error) throw error
}

/**
 * ============================================
 * ROUTINE ITEMS
 * ============================================
 */

/**
 * Add an item to a routine
 */
export async function addRoutineItem(
  item: RoutineItemInsert
): Promise<RoutineItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routine_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a routine item
 */
export async function updateRoutineItem(
  itemId: string,
  updates: RoutineItemUpdate
): Promise<RoutineItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routine_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a routine item
 */
export async function deleteRoutineItem(itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('routine_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Reorder routine items
 */
export async function reorderRoutineItems(
  items: Array<{ id: string; sort_order: number }>
) {
  const supabase = await createClient()

  // Update each item's sort order
  const updates = items.map(item =>
    supabase
      .from('routine_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  )

  await Promise.all(updates)
}

/**
 * ============================================
 * ROUTINE COMPLETIONS
 * ============================================
 */

/**
 * Mark routine as completed
 */
export async function completeRoutine(
  routineId: string,
  completedBy: string,
  completedItems: string[]
): Promise<RoutineCompletion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      routine_id: routineId,
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      completed_items: completedItems,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get routine completions for a date range
 */
export async function getRoutineCompletions(
  routineId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routine_completions')
    .select(`
      *,
      completer:family_members!routine_completions_completed_by_fkey(id, name, avatar_url)
    `)
    .eq('routine_id', routineId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get today's routine completions for a member
 */
export async function getTodayCompletions(memberId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('routine_completions')
    .select(`
      *,
      routine:routines(id, name, time_of_day)
    `)
    .eq('completed_by', memberId)
    .gte('completed_at', today.toISOString())
    .lt('completed_at', tomorrow.toISOString())

  if (error) throw error
  return data || []
}

/**
 * Check if routine was completed today
 */
export async function wasRoutineCompletedToday(
  routineId: string,
  memberId: string
): Promise<boolean> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('routine_id', routineId)
    .eq('completed_by', memberId)
    .gte('completed_at', today.toISOString())
    .lt('completed_at', tomorrow.toISOString())
    .maybeSingle()

  if (error) throw error
  return !!data
}

/**
 * ============================================
 * ROUTINE STATISTICS
 * ============================================
 */

/**
 * Get routine completion stats
 */
export async function getRoutineStats(
  routineId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routine_completions')
    .select('completed_at, completed_items')
    .eq('routine_id', routineId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)

  if (error) throw error

  const completions = data || []
  const totalCompletions = completions.length
  
  // Calculate average items completed
  const totalItems = completions.reduce(
    (sum, c) => sum + (c.completed_items?.length || 0),
    0
  )
  const avgItemsCompleted = totalCompletions > 0 ? totalItems / totalCompletions : 0

  return {
    totalCompletions,
    avgItemsCompleted,
    completions,
  }
}

/**
 * Get member routine completion rate
 */
export async function getMemberRoutineCompletionRate(
  memberId: string,
  days = 7
) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get assigned routines
  const { data: routines } = await supabase
    .from('routines')
    .select('id')
    .eq('assigned_to', memberId)
    .eq('is_active', true)

  const routineCount = routines?.length || 0
  const expectedCompletions = routineCount * days

  // Get completions
  const { data: completions } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('completed_by', memberId)
    .gte('completed_at', startDate.toISOString())

  const actualCompletions = completions?.length || 0
  const completionRate =
    expectedCompletions > 0 ? (actualCompletions / expectedCompletions) * 100 : 0

  return {
    routineCount,
    expectedCompletions,
    actualCompletions,
    completionRate,
  }
}
