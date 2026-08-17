import { createClient } from '@/lib/supabase/server'
import { writeAuditLog, LifecycleError, requireViewerContext } from '@/lib/data/lifecycle-core'
import {
  addDishToMealEntry,
  createMealPlanEntry,
  deleteDish,
  deleteMealPlanEntry,
  getMealPlanWithEntries,
  getOrCreateMealPlan,
  updateDish,
  updateMealPlanEntry,
} from '@/lib/data/meals'
import type {
  CreateMealPlanLifecycleDishInput,
  CreateMealPlanLifecycleEntryInput,
  MealPlanLifecycleDishRecord,
  MealPlanLifecycleEntryRecord,
  MealPlanLifecycleRecord,
  MealPlanLifecycleResponse,
  UpdateMealPlanLifecycleDishInput,
  UpdateMealPlanLifecycleEntryInput,
} from '@/types/meal-plan-lifecycle'

const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

type FamilySettingsRow = {
  settings?: Record<string, unknown> | null
}

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate()
  ).padStart(2, '0')}`
}

function normalizeDish(dish: Record<string, unknown>): MealPlanLifecycleDishRecord {
  const recipeSource =
    (dish.recipe as Record<string, unknown> | null | undefined) ??
    (dish['recipe_summary'] as Record<string, unknown> | null | undefined) ??
    null

  return {
    id: String(dish.id),
    dishName: typeof dish.dish_name === 'string' ? dish.dish_name : (dish.dishName as string | null) ?? null,
    recipeId:
      typeof dish.recipe_id === 'string' ? dish.recipe_id : (dish.recipeId as string | null) ?? null,
    sortOrder:
      typeof dish.sort_order === 'number'
        ? dish.sort_order
        : (dish.sortOrder as number | null | undefined) ?? null,
    recipe: recipeSource
      ? {
          id: String(recipeSource.id),
          name: String(recipeSource.name ?? ''),
          prepTimeMinutes:
            typeof recipeSource.prep_time_minutes === 'number'
              ? recipeSource.prep_time_minutes
              : (recipeSource.prepTimeMinutes as number | null | undefined) ?? null,
          cookTimeMinutes:
            typeof recipeSource.cook_time_minutes === 'number'
              ? recipeSource.cook_time_minutes
              : (recipeSource.cookTimeMinutes as number | null | undefined) ?? null,
        }
      : null,
  }
}

function normalizeEntry(entry: Record<string, unknown>): MealPlanLifecycleEntryRecord {
  const dishes = Array.isArray(entry.dishes)
    ? entry.dishes.map((dish) => normalizeDish(dish as Record<string, unknown>))
    : []

  return {
    id: String(entry.id),
    date: String(entry.date),
    mealType: String(entry.meal_type ?? entry.mealType ?? ''),
    customName:
      typeof entry.custom_name === 'string'
        ? entry.custom_name
        : (entry.customName as string | null | undefined) ?? null,
    notes: (entry.notes as string | null | undefined) ?? null,
    recipeId:
      typeof entry.recipe_id === 'string'
        ? entry.recipe_id
        : (entry.recipeId as string | null | undefined) ?? null,
    dishes,
  }
}

function normalizeMealPlan(plan: Record<string, unknown>): MealPlanLifecycleRecord {
  const entries = Array.isArray(plan.entries) ? plan.entries : []

  return {
    id: String(plan.id),
    weekStart: String(plan.week_start ?? plan.weekStart ?? ''),
    meals: entries.map((entry) => normalizeEntry(entry as Record<string, unknown>)),
  }
}

async function getFamilyWeekStartDay(familyId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('families')
    .select('settings')
    .eq('id', familyId)
    .single<FamilySettingsRow>()

  const settings = data?.settings ?? null
  return settings?.weekStartDay === 'MONDAY' ? 'MONDAY' : 'SUNDAY'
}

async function resolveWeekStart(familyId: string, weekParam: string) {
  const weekDate = new Date(`${weekParam}T00:00:00`)
  if (Number.isNaN(weekDate.getTime())) {
    throw new LifecycleError(400, 'Invalid date format')
  }

  const startDay = await getFamilyWeekStartDay(familyId)
  const weekStartDate = new Date(weekDate)
  const dayOfWeek = weekStartDate.getDay()

  if (startDay === 'SUNDAY') {
    weekStartDate.setDate(weekStartDate.getDate() - dayOfWeek)
  } else {
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStartDate.setDate(weekStartDate.getDate() - diff)
  }

  return toIsoDate(weekStartDate)
}

async function readMealEntryOwnership(entryId: string, familyId: string) {
  const supabase = await createClient()
  const { data: entry } = await supabase
    .from('meal_plan_entries')
    .select('id, meal_plan:meal_plans!inner(family_id)')
    .eq('id', entryId)
    .single()

  if (!entry) {
    throw new LifecycleError(404, 'Meal entry not found')
  }

  if ((entry as { meal_plan?: { family_id?: string | null } }).meal_plan?.family_id !== familyId) {
    throw new LifecycleError(403, 'You do not have permission to access this meal entry')
  }
}

async function readDishOwnership(dishId: string, familyId: string) {
  const supabase = await createClient()
  const { data: dish } = await (supabase as any)
    .from('meal_plan_dishes')
    .select('entry:meal_plan_entries!inner(meal_plan:meal_plans!inner(family_id))')
    .eq('id', dishId)
    .single()

  if (!dish) {
    throw new LifecycleError(404, 'Dish not found')
  }

  if (dish.entry?.meal_plan?.family_id !== familyId) {
    throw new LifecycleError(404, 'Dish not found')
  }
}

export async function getMealPlanLifecyclePlan(
  query: { week?: string | null }
): Promise<MealPlanLifecycleResponse> {
  const { familyId } = await requireViewerContext()
  const weekParam = query.week

  if (!weekParam) {
    throw new LifecycleError(400, 'Week parameter is required (format: YYYY-MM-DD)')
  }

  const weekDate = new Date(`${weekParam}T00:00:00`)
  if (Number.isNaN(weekDate.getTime())) {
    throw new LifecycleError(400, 'Invalid date format')
  }

  const mealPlan = await getMealPlanWithEntries(familyId, weekParam)

  return {
    mealPlan: mealPlan ? normalizeMealPlan(mealPlan as Record<string, unknown>) : null,
    weekStart: weekParam,
  }
}

export async function createMealPlanLifecycleEntry(
  body: CreateMealPlanLifecycleEntryInput
): Promise<MealPlanLifecycleEntryRecord> {
  const { familyId, memberId } = await requireViewerContext()
  const supabase = await createClient()
  const { date, mealType, customName, notes, recipeId, dishes, weekStart } = body

  if (!date) {
    throw new LifecycleError(400, 'Date is required')
  }

  if (!mealType) {
    throw new LifecycleError(400, 'Meal type is required')
  }

  if (!VALID_MEAL_TYPES.includes(mealType)) {
    throw new LifecycleError(
      400,
      'Invalid meal type. Must be BREAKFAST, LUNCH, DINNER, or SNACK'
    )
  }

  if (!customName && !recipeId && (!dishes || dishes.length === 0)) {
    throw new LifecycleError(
      400,
      'Either customName, recipeId, or dishes array must be provided'
    )
  }

  const mealDate = new Date(date)
  if (Number.isNaN(mealDate.getTime())) {
    throw new LifecycleError(400, 'Invalid date format')
  }
  mealDate.setUTCHours(0, 0, 0, 0)

  let resolvedWeekStart = weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : ''
  if (!resolvedWeekStart) {
    const computedWeekStart = new Date(mealDate)
    const day = computedWeekStart.getUTCDay()
    const diff = computedWeekStart.getUTCDate() - day + (day === 0 ? -6 : 1)
    computedWeekStart.setUTCDate(diff)
    resolvedWeekStart = computedWeekStart.toISOString().split('T')[0]
  }

  const mealPlan = await getOrCreateMealPlan(familyId, resolvedWeekStart)
  const entry = await createMealPlanEntry({
    meal_plan_id: mealPlan.id,
    date: mealDate.toISOString().split('T')[0],
    meal_type: mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK',
    custom_name: customName?.trim() || null,
    notes: notes?.trim() || null,
    recipe_id: recipeId || null,
  })

  if (dishes && dishes.length > 0) {
    for (let index = 0; index < dishes.length; index += 1) {
      const candidate = dishes[index]
      let dishName = candidate.dishName ?? undefined

      if (candidate.recipeId && !dishName) {
        const { data: recipe } = await supabase
          .from('recipes')
          .select('name, family_id')
          .eq('id', candidate.recipeId)
          .eq('family_id', familyId)
          .single()

        if (recipe) {
          dishName = recipe.name
        }
      }

      if (dishName) {
        await addDishToMealEntry({
          meal_entry_id: entry.id,
          recipe_id: candidate.recipeId || null,
          dish_name: dishName,
          sort_order: index,
        })
      }
    }
  }

  await writeAuditLog({
    familyId,
    memberId,
    action: 'MEAL_ENTRY_ADDED',
    entityType: 'MEAL_PLAN',
    entityId: entry.id,
    metadata: {
      entryId: entry.id,
      mealType: entry.meal_type,
      date: entry.date,
    },
  })

  const refreshedPlan = await getMealPlanWithEntries(familyId, resolvedWeekStart)
  const refreshedEntry = Array.isArray((refreshedPlan as { entries?: unknown[] } | null)?.entries)
    ? (refreshedPlan as { entries: unknown[] }).entries.find(
        (candidate) => (candidate as { id?: string }).id === entry.id
      )
    : null

  return ((refreshedEntry as Record<string, unknown> | null) ??
    (entry as Record<string, unknown>)) as unknown as MealPlanLifecycleEntryRecord
}

export async function updateMealPlanLifecycleEntryAction(
  entryId: string,
  body: UpdateMealPlanLifecycleEntryInput
) {
  const { familyId, memberId } = await requireViewerContext()
  await readMealEntryOwnership(entryId, familyId)
  const updatedEntry = await updateMealPlanEntry(entryId, {
    custom_name: body.customName,
    notes: body.notes,
    recipe_id: body.recipeId,
  })

  await writeAuditLog({
    familyId,
    memberId,
    action: 'MEAL_ENTRY_UPDATED',
    entityType: 'MEAL_PLAN',
    entityId: entryId,
    metadata: {
      entryId,
      customName: body.customName ?? null,
      notes: body.notes ?? null,
      recipeId: body.recipeId ?? null,
    },
  })

  return updatedEntry as unknown as MealPlanLifecycleEntryRecord
}

export async function deleteMealPlanLifecycleEntryAction(entryId: string) {
  const { familyId, memberId } = await requireViewerContext()
  await readMealEntryOwnership(entryId, familyId)
  await deleteMealPlanEntry(entryId)

  await writeAuditLog({
    familyId,
    memberId,
    action: 'MEAL_ENTRY_DELETED',
    entityType: 'MEAL_PLAN',
    entityId: entryId,
    metadata: {
      entryId,
    },
  })
}

export async function createMealPlanLifecycleDish(
  body: CreateMealPlanLifecycleDishInput
): Promise<MealPlanLifecycleDishRecord> {
  const { familyId } = await requireViewerContext()

  if (!body.mealEntryId) {
    throw new LifecycleError(400, 'Meal entry ID is required')
  }

  if (!body.recipeId && !body.dishName) {
    throw new LifecycleError(400, 'Either dishName or recipeId is required')
  }

  try {
    const dish = await addDishToMealEntry(body.mealEntryId, {
      recipeId: body.recipeId ?? undefined,
      dishName: body.dishName ?? undefined,
      familyId,
    })

    return dish as unknown as MealPlanLifecycleDishRecord
  } catch (error) {
    const candidate = error as { status?: number; message?: string }
    if (candidate.status && candidate.message) {
      throw new LifecycleError(candidate.status, candidate.message)
    }

    throw error
  }
}

export async function updateMealPlanLifecycleDishAction(
  dishId: string,
  body: UpdateMealPlanLifecycleDishInput
) {
  const { familyId } = await requireViewerContext()
  await readDishOwnership(dishId, familyId)
  const updatedDish = await updateDish(dishId, {
    dishName: body.dishName ?? undefined,
    recipeId: body.recipeId ?? undefined,
    sortOrder: body.sortOrder,
  })

  return updatedDish as unknown as MealPlanLifecycleDishRecord
}

export async function deleteMealPlanLifecycleDishAction(dishId: string) {
  const { familyId } = await requireViewerContext()
  await readDishOwnership(dishId, familyId)
  await deleteDish(dishId)
}
