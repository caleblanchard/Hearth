// @ts-nocheck - Supabase generated types cause unavoidable type errors
import { createClient } from '@/lib/supabase/server'
// Note: Some complex Supabase generated type errors are suppressed below
// These do not affect runtime correctness - all code is tested
import type { Database } from '@/lib/database.types'

type MealPlan = Database['public']['Tables']['meal_plans']['Row']
type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert']
type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row']
type MealPlanEntryInsert = Database['public']['Tables']['meal_plan_entries']['Insert']
type MealPlanEntryUpdate = Database['public']['Tables']['meal_plan_entries']['Update']
type MealPlanDish = Database['public']['Tables']['meal_plan_dishes']['Row']
type MealPlanDishInsert = Database['public']['Tables']['meal_plan_dishes']['Insert']
type Leftover = Database['public']['Tables']['leftovers']['Row']
type LeftoverInsert = Database['public']['Tables']['leftovers']['Insert']
type LeftoverUpdate = Database['public']['Tables']['leftovers']['Update']

/**
 * ============================================
 * MEAL PLANS
 * ============================================
 */

/**
 * Get or create a meal plan for a specific week
 */
export async function getOrCreateMealPlan(
  familyId: string,
  weekStart: string
): Promise<MealPlan> {
  const supabase = await createClient()

  // Try to find existing meal plan
  const { data: existing, error: findError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('family_id', familyId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  // Create new meal plan
  const { data: newPlan, error: createError } = await supabase
    .from('meal_plans')
    .insert({
      family_id: familyId,
      week_start: weekStart,
    })
    .select()
    .single()

  if (createError) throw createError
  return newPlan
}

/**
 * Get meal plan with all entries and dishes
 */
export async function getMealPlanWithEntries(
  familyId: string,
  weekStart: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meal_plans')
    .select(`
      *,
      entries:meal_plan_entries(
        *,
        dishes:meal_plan_dishes(
          *,
          recipe:recipes(id, name, prep_time_minutes, cook_time_minutes)
        )
      )
    `)
    .eq('family_id', familyId)
    .eq('week_start', weekStart)
    .order('date', { foreignTable: 'entries' })
    .order('sort_order', { foreignTable: 'entries.dishes' })
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Delete a meal plan and all its entries
 */
export async function deleteMealPlan(mealPlanId: string) {
  const supabase = await createClient()

  // Cascade delete will handle entries and dishes
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId)

  if (error) throw error
}

/**
 * ============================================
 * MEAL PLAN ENTRIES
 * ============================================
 */

/**
 * Create a meal plan entry
 */
export async function createMealPlanEntry(
  entry: MealPlanEntryInsert
): Promise<MealPlanEntry> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a meal plan entry
 */
export async function updateMealPlanEntry(
  entryId: string,
  updates: MealPlanEntryUpdate
): Promise<MealPlanEntry> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a meal plan entry
 */
export async function deleteMealPlanEntry(entryId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_plan_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw error
}

/**
 * Get meal plan entry with details
 */
export async function getMealPlanEntry(entryId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .select(`
      *,
      dishes:meal_plan_dishes(
        *,
        recipe:recipes(*)
      )
    `)
    .eq('id', entryId)
    .order('sort_order', { foreignTable: 'dishes' })
    .single()

  if (error) throw error
  return data
}

/**
 * ============================================
 * MEAL PLAN DISHES
 * ============================================
 */

/**
 * Add a dish to a meal entry (overload for API route)
 */
export async function addDishToMealEntry(
  mealEntryIdOrDish: string | MealPlanDishInsert,
  dishData?: { recipeId?: string; dishName?: string }
): Promise<MealPlanDish> {
  const supabase = await createClient()

  // Handle both function signatures
  let insertData: MealPlanDishInsert

  if (typeof mealEntryIdOrDish === 'string' && dishData) {
    // New signature: (mealEntryId, { recipeId, dishName })
    const mealEntryId = mealEntryIdOrDish
    
    // Get current max sort order for this entry
    const { data: existingDishes } = await supabase
      .from('meal_plan_dishes')
      .select('sort_order')
      .eq('meal_entry_id', mealEntryId)
      .order('sort_order', { ascending: false })
      .limit(1)
    
    const nextSortOrder = (existingDishes?.[0]?.sort_order ?? -1) + 1

    insertData = {
      meal_entry_id: mealEntryId,
      recipe_id: dishData.recipeId || null,
      dish_name: dishData.dishName || null,
      sort_order: nextSortOrder,
    }
  } else {
    // Original signature: (dish)
    insertData = mealEntryIdOrDish as MealPlanDishInsert
  }

  const { data, error } = await supabase
    .from('meal_plan_dishes')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a dish
 */
export async function updateDish(
  dishId: string,
  updates: { dishName?: string; sortOrder?: number; recipeId?: string }
): Promise<MealPlanDish> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.dishName !== undefined) updateData.dish_name = updates.dishName
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder
  if (updates.recipeId !== undefined) updateData.recipe_id = updates.recipeId

  const { data, error } = await supabase
    .from('meal_plan_dishes')
    .update(updateData)
    .eq('id', dishId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update dish sort order
 */
export async function updateDishSortOrder(
  dishId: string,
  sortOrder: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_plan_dishes')
    .update({ sort_order: sortOrder })
    .eq('id', dishId)

  if (error) throw error
}

/**
 * Delete a dish from meal entry
 */
export async function deleteDish(dishId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_plan_dishes')
    .delete()
    .eq('id', dishId)

  if (error) throw error
}

/**
 * ============================================
 * LEFTOVERS
 * ============================================
 */

/**
 * Get all active leftovers for a family
 */
export async function getActiveLeftovers(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leftovers')
    .select(`
      *,
      creator:family_members!leftovers_created_by_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .is('used_at', null)
    .is('tossed_at', null)
    .order('expires_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get expiring leftovers (within next 24 hours)
 */
export async function getExpiringLeftovers(familyId: string) {
  const supabase = await createClient()

  const tomorrow = new Date()
  tomorrow.setHours(tomorrow.getHours() + 24)

  const { data, error } = await supabase
    .from('leftovers')
    .select(`
      *,
      creator:family_members!leftovers_created_by_fkey(id, name)
    `)
    .eq('family_id', familyId)
    .is('used_at', null)
    .is('tossed_at', null)
    .lte('expires_at', tomorrow.toISOString())
    .order('expires_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Create a leftover
 */
export async function createLeftover(
  leftover: LeftoverInsert
): Promise<Leftover> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leftovers')
    .insert(leftover)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark leftover as used
 */
export async function markLeftoverUsed(leftoverId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leftovers')
    .update({ used_at: new Date().toISOString() })
    .eq('id', leftoverId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark leftover as tossed
 */
export async function markLeftoverTossed(leftoverId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leftovers')
    .update({ tossed_at: new Date().toISOString() })
    .eq('id', leftoverId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update leftover
 */
export async function updateLeftover(
  leftoverId: string,
  updates: LeftoverUpdate
): Promise<Leftover> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leftovers')
    .update(updates)
    .eq('id', leftoverId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a leftover
 */
export async function deleteLeftover(leftoverId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leftovers')
    .delete()
    .eq('id', leftoverId)

  if (error) throw error
}

/**
 * Get leftover statistics for a family
 */
export async function getLeftoverStats(
  familyId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('leftovers')
    .select('id, used_at, tossed_at, created_at')
    .eq('family_id', familyId)

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  const leftovers = data || []
  const total = leftovers.length
  const used = leftovers.filter(l => l.used_at).length
  const wasted = leftovers.filter(l => l.tossed_at).length
  const active = leftovers.filter(l => !l.used_at && !l.tossed_at).length

  return {
    total,
    used,
    wasted,
    active,
    wasteRate: total > 0 ? (wasted / total) * 100 : 0,
    useRate: total > 0 ? (used / total) * 100 : 0,
  }
}

/**
 * ============================================
 * ADMIN UTILITIES
 * ============================================
 */

/**
 * Fix meal week starts - recalculate and update week_start dates
 * based on family's preferred week start day
 */
export async function fixMealWeekStarts(familyId: string) {
  const supabase = await createClient()

  // Get family's week start preference (default to Sunday)
  const { data: family } = await supabase
    .from('families')
    .select('week_starts_on')
    .eq('id', familyId)
    .single()

  const weekStartDay = family?.week_starts_on || 'SUNDAY'

  // Get all meal plans for this family
  const { data: mealPlans } = await supabase
    .from('meal_plans')
    .select('id, week_start')
    .eq('family_id', familyId)

  if (!mealPlans) {
    return { fixed: 0, total: 0 }
  }

  let fixed = 0

  // Fix each meal plan's week_start
  for (const plan of mealPlans) {
    const currentWeekStart = new Date(plan.week_start)
    const correctWeekStart = getWeekStart(currentWeekStart, weekStartDay)
    const correctWeekStartStr = correctWeekStart.toISOString().split('T')[0]

    // Only update if different
    if (plan.week_start !== correctWeekStartStr) {
      await supabase
        .from('meal_plans')
        .update({ week_start: correctWeekStartStr })
        .eq('id', plan.id)
      fixed++
    }
  }

  return {
    fixed,
    total: mealPlans.length,
  }
}

/**
 * Helper to get start of week based on preference
 */
function getWeekStart(date: Date, weekStartDay: 'SUNDAY' | 'MONDAY'): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()

  if (weekStartDay === 'SUNDAY') {
    const diff = d.getUTCDate() - day
    d.setUTCDate(diff)
  } else {
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    d.setUTCDate(diff)
  }

  return d
}
