import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  CreateMealPlanLifecycleDishInput,
  CreateMealPlanLifecycleEntryInput,
  MealPlanLifecycleDishRecord,
  MealPlanLifecycleEntryRecord,
  MealPlanLifecycleResponse,
  UpdateMealPlanLifecycleDishInput,
  UpdateMealPlanLifecycleEntryInput,
} from '@/types/meal-plan-lifecycle'

const planClient = createLifecycleClient<MealPlanLifecycleEntryRecord>({
  basePath: '/api/meals/plan',
  itemKey: 'entry',
})

const dishesClient = createLifecycleClient<MealPlanLifecycleDishRecord>({
  basePath: '/api/meals/plan/dishes',
  itemKey: 'dish',
})

export function fetchMealPlanLifecyclePlanClient(week: string): Promise<MealPlanLifecycleResponse> {
  return planClient.action<MealPlanLifecycleResponse>('', 'GET', undefined, undefined, { week })
}

export function createMealPlanLifecycleEntryClient(
  input: CreateMealPlanLifecycleEntryInput,
): Promise<MealPlanLifecycleEntryRecord> {
  return planClient.create(input)
}

export function updateMealPlanLifecycleEntryClient(
  entryId: string,
  input: UpdateMealPlanLifecycleEntryInput,
): Promise<MealPlanLifecycleEntryRecord> {
  return planClient.update(entryId, input)
}

export function deleteMealPlanLifecycleEntryClient(entryId: string): Promise<void> {
  return planClient.remove(entryId)
}

export function createMealPlanLifecycleDishClient(
  input: CreateMealPlanLifecycleDishInput,
): Promise<MealPlanLifecycleDishRecord> {
  return dishesClient.create(input)
}

export function updateMealPlanLifecycleDishClient(
  dishId: string,
  input: UpdateMealPlanLifecycleDishInput,
): Promise<MealPlanLifecycleDishRecord> {
  return dishesClient.update(dishId, input)
}

export function deleteMealPlanLifecycleDishClient(dishId: string): Promise<void> {
  return dishesClient.remove(dishId)
}
