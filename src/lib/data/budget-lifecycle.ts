import { LifecycleError, requireViewerContext } from '@/lib/data/lifecycle-core'
import { createClient, isParentInFamily } from '@/lib/supabase/server'
import { createBudget, getBudgets } from '@/lib/data/financial'
import type { BudgetLifecycleRecord } from '@/types/budget-lifecycle'

function normalizeBudget(budget: Record<string, unknown>): BudgetLifecycleRecord {
  return {
    id: String(budget.id),
    memberId: String(budget.member_id ?? budget.memberId ?? ''),
    category: String(budget.category ?? ''),
    limitAmount: Number(budget.limit_amount ?? budget.limitAmount ?? 0),
    period: String(budget.period ?? ''),
    isActive: Boolean(budget.is_active ?? budget.isActive),
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
            periodKey: String(source.period_key ?? source.periodKey ?? ''),
            periodStart:
              (source.period_start as string | null | undefined) ??
              (source.periodStart as string | null | undefined) ??
              null,
            periodEnd:
              (source.period_end as string | null | undefined) ??
              (source.periodEnd as string | null | undefined) ??
              null,
            spent: Number(source.spent ?? 0),
            createdAt:
              (source.created_at as string | null | undefined) ??
              (source.createdAt as string | null | undefined) ??
              null,
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
  const { familyId, memberId } = await requireViewerContext()
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

  if (targetMemberId !== memberId) {
    const isParent = await isParentInFamily(familyId)
    if (!isParent) {
      throw new LifecycleError(403, 'Parent access required')
    }
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
      limitAmount: Number(body.amount ?? body.limitAmount),
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
  const { familyId, memberId } = await requireViewerContext()
  const supabase = await createClient()
  const { data: budget } = await supabase
    .from('budgets')
    .select('id, member_id, family_members!inner(family_id)')
    .eq('id', budgetId)
    .single()

  if (!budget || (budget as { family_members?: { family_id?: string } }).family_members?.family_id !== familyId) {
    throw new LifecycleError(404, 'Budget not found')
  }

  const canManageOthers = await isParentInFamily(familyId)
  if ((budget as { member_id?: string }).member_id !== memberId && !canManageOthers) {
    throw new LifecycleError(403, 'Parent access required')
  }

  const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
  if (error) {
    throw error
  }
}
