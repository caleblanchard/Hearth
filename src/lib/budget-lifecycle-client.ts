import { createLifecycleClient } from '@/lib/lifecycle-client'
import type { BudgetLifecycleRecord, CreateBudgetLifecycleInput } from '@/types/budget-lifecycle'

const budgetClient = createLifecycleClient<BudgetLifecycleRecord>({
  basePath: '/api/financial/budgets',
  listKey: 'budgets',
})

export function fetchBudgetLifecycleBudgetsClient(): Promise<BudgetLifecycleRecord[]> {
  return budgetClient.list()
}

export function createBudgetLifecycleBudgetClient(
  input: CreateBudgetLifecycleInput,
): Promise<{ success: true; budget: BudgetLifecycleRecord; message?: string }> {
  return budgetClient.action<{ success: true; budget: BudgetLifecycleRecord; message?: string }>(
    '',
    'POST',
    input,
  )
}

export function deleteBudgetLifecycleBudgetClient(budgetId: string): Promise<void> {
  return budgetClient.remove(budgetId)
}
