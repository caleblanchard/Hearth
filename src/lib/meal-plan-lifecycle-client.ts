import type {
  CreateMealPlanLifecycleDishInput,
  CreateMealPlanLifecycleEntryInput,
  MealPlanLifecycleDishRecord,
  MealPlanLifecycleEntryRecord,
  MealPlanLifecycleResponse,
  UpdateMealPlanLifecycleDishInput,
  UpdateMealPlanLifecycleEntryInput,
} from '@/types/meal-plan-lifecycle'
import { apiRequest } from '@/lib/api-client'

export async function fetchMealPlanLifecyclePlanClient(week: string) {
  return apiRequest<MealPlanLifecycleResponse>(`/api/meals/plan?week=${week}`)
}

export async function createMealPlanLifecycleEntryClient(
  input: CreateMealPlanLifecycleEntryInput
) {
  const data = await apiRequest<{
    entry: MealPlanLifecycleEntryRecord
  }>('/api/meals/plan', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.entry
}

export async function updateMealPlanLifecycleEntryClient(
  entryId: string,
  input: UpdateMealPlanLifecycleEntryInput
) {
  const data = await apiRequest<{
    entry: MealPlanLifecycleEntryRecord
  }>(`/api/meals/plan/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.entry
}

export async function deleteMealPlanLifecycleEntryClient(entryId: string) {
  await apiRequest<{ success: true }>(`/api/meals/plan/${entryId}`, {
    method: 'DELETE',
  })
}

export async function createMealPlanLifecycleDishClient(input: CreateMealPlanLifecycleDishInput) {
  const data = await apiRequest<{
    dish: MealPlanLifecycleDishRecord
  }>('/api/meals/plan/dishes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.dish
}

export async function updateMealPlanLifecycleDishClient(
  dishId: string,
  input: UpdateMealPlanLifecycleDishInput
) {
  const data = await apiRequest<{
    dish: MealPlanLifecycleDishRecord
  }>(`/api/meals/plan/dishes/${dishId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.dish
}

export async function deleteMealPlanLifecycleDishClient(dishId: string) {
  await apiRequest<{ success: true }>(`/api/meals/plan/dishes/${dishId}`, {
    method: 'DELETE',
  })
}
