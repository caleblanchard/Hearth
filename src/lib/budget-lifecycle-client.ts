import type { BudgetLifecycleRecord } from '@/types/budget-lifecycle'
import { apiRequest } from '@/lib/api-client'

export async function fetchBudgetLifecycleBudgetsClient() {
  const data = await apiRequest<{ budgets: BudgetLifecycleRecord[] }>('/api/financial/budgets')
  return data.budgets
}

export async function createBudgetLifecycleBudgetClient(input: Record<string, unknown>) {
  return apiRequest<{ success: true; budget: BudgetLifecycleRecord; message?: string }>(
    '/api/financial/budgets',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function deleteBudgetLifecycleBudgetClient(budgetId: string) {
  await apiRequest<{ success: true }>(`/api/financial/budgets/${budgetId}`, {
    method: 'DELETE',
  })
}
