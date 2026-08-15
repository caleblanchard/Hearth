export interface MealPlanLifecycleRecipeSummary {
  id: string
  name: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
}

export interface MealPlanLifecycleDishRecord {
  id: string
  dishName: string | null
  recipeId: string | null
  sortOrder: number | null
  recipe?: MealPlanLifecycleRecipeSummary | null
}

export interface MealPlanLifecycleEntryRecord {
  id: string
  date: string
  mealType: string
  customName: string | null
  notes: string | null
  recipeId: string | null
  dishes: MealPlanLifecycleDishRecord[]
}

export interface MealPlanLifecycleRecord {
  id: string
  weekStart: string
  meals: MealPlanLifecycleEntryRecord[]
}

export interface MealPlanLifecycleResponse {
  mealPlan: MealPlanLifecycleRecord | null
  weekStart: string
}

export interface CreateMealPlanLifecycleDishInput {
  mealEntryId?: string | null
  recipeId?: string | null
  dishName?: string | null
}

export interface UpdateMealPlanLifecycleDishInput {
  recipeId?: string | null
  dishName?: string | null
  sortOrder?: number
}

export interface CreateMealPlanLifecycleEntryInput {
  date?: string | null
  mealType?: string | null
  customName?: string | null
  notes?: string | null
  recipeId?: string | null
  weekStart?: string | null
  dishes?: Array<{
    recipeId?: string | null
    dishName?: string | null
  }>
}

export interface UpdateMealPlanLifecycleEntryInput {
  customName?: string | null
  notes?: string | null
  recipeId?: string | null
}

