import {
  LifecycleError,
  pickKey,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { createClient } from '@/lib/supabase/server'
import { createBudget, getBudgets } from '@/lib/data/financial'
import type { BudgetLifecycleRecord } from '@/types/budget-lifecycle'

function normalizeBudget(budget: Record<string, unknown>): BudgetLifecycleRecord {
  return {
    id: String(budget.id),
    memberId: String(pickKey(budget, 'memberId', 'member_id') ?? ''),
    category: String(budget.category ?? ''),
    limitAmount: Number(pickKey(budget, 'limitAmount', 'limit_amount') ?? 0),
    period: String(budget.period ?? ''),
    isActive: Boolean(pickKey(budget, 'isActive', 'is_active')),
    member: budget.member
      ? {
          id: String((budget.member as Record<string, unknown>).id ?? ''),
          name: String((budget.member as Record<string, unknown>).name ?? ''),
        }
      : null,
    periods: Array.isArray(budget.periods)
      ? budget.periods.map((period) => {
          const source = period as Record<string, unknown>
          return {
            id: String(source.id),
            periodKey: String(pickKey(source, 'periodKey', 'period_key') ?? ''),
            periodStart:
              (pickKey(source, 'periodStart', 'period_start') as
                | string
                | null
                | undefined) ?? null,
            periodEnd:
              (pickKey(source, 'periodEnd', 'period_end') as
                | string
                | null
                | undefined) ?? null,
            spent: Number(source.spent ?? 0),
            createdAt:
              (pickKey(source, 'createdAt', 'created_at') as
                | string
                | null
                | undefined) ?? null,
          }
        })
      : [],
  }
}

export async function getBudgetLifecycleBudgets() {
  const { familyId, memberId } = await requireViewerContext()
  const budgets = await getBudgets(familyId, memberId)
  return budgets.map((budget) => normalizeBudget(budget as Record<string, unknown>))
}

export async function createBudgetLifecycleBudget(body: Record<string, unknown>) {
  const { familyId, memberId, isParent } = await requireViewerContext()
  const targetMemberId =
    typeof body.memberId === 'string' && body.memberId.length > 0 ? body.memberId : memberId

  if (!body.category) {
    throw new LifecycleError(400, 'Category is required')
  }

  if (
    body.limitAmount === undefined ||
    typeof body.limitAmount !== 'number' ||
    body.limitAmount <= 0
  ) {
    throw new LifecycleError(400, 'Limit amount must be positive')
  }

  if (
    !body.period ||
    typeof body.period !== 'string' ||
    !['weekly', 'monthly'].includes(body.period.toLowerCase())
  ) {
    throw new LifecycleError(400, 'Period must be "weekly" or "monthly"')
  }

  if (targetMemberId !== memberId && !isParent) {
    throw new LifecycleError(403, 'Parent access required')
  }

  const supabase = await createClient()
  const category = String(body.category)
  const period = String(body.period)
  const budgetCategory = category as 'REWARDS' | 'SCREEN_TIME' | 'SAVINGS' | 'TRANSFER' | 'OTHER'
  const { data: existingBudget } = await supabase
    .from('budgets')
    .select('id')
    .eq('member_id', targetMemberId)
    .eq('category', budgetCategory)
    .eq('period', period)
    .eq('is_active', true)
    .maybeSingle()

  if (existingBudget) {
    throw new LifecycleError(409, 'Budget already exists for this category and period')
  }

  try {
    return await createBudget(familyId, {
      memberId: targetMemberId,
      category,
      limitAmount: body.limitAmount,
      period,
      resetDay: typeof body.resetDay === 'number' ? body.resetDay : 0,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Member not found in family') {
      throw new LifecycleError(404, 'Family member not found')
    }

    throw error
  }
}

export async function deleteBudgetLifecycleBudget(budgetId: string) {
  const { familyId, memberId, isParent } = await requireViewerContext()
  const supabase = await createClient()
  const { data: budget } = await supabase
    .from('budgets')
    .select('id, member_id, family_members!inner(family_id)')
    .eq('id', budgetId)
    .single()

  if (!budget || (budget as { family_members?: { family_id?: string } }).family_members?.family_id !== familyId) {
    throw new LifecycleError(404, 'Budget not found')
  }

  if ((budget as { member_id?: string }).member_id !== memberId && !isParent) {
    throw new LifecycleError(403, 'Parent access required')
  }

  const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
  if (error) {
    throw error
  }
}
