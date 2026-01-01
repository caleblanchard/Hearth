import { SpendingCategory } from '@/app/generated/prisma'

export interface Budget {
  id: string
  memberId: string
  category: SpendingCategory
  limitAmount: number
  period: string // "weekly" | "monthly"
  resetDay: number
  isActive: boolean
}

export interface BudgetPeriod {
  id: string
  budgetId: string
  periodKey: string
  periodStart: Date
  periodEnd: Date
  spent: number
}

export interface BudgetStatus {
  status: 'ok' | 'warning' | 'exceeded'
  currentSpent: number
  projectedSpent: number
  budgetLimit: number
  remainingBudget: number
  percentageUsed: number
}

/**
 * Get ISO week number from date
 */
function getISOWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Get current period key based on period type
 */
export function getCurrentPeriodKey(period: string): string {
  const now = new Date()

  if (period === 'weekly') {
    return getISOWeek(now)
  } else if (period === 'monthly') {
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  throw new Error(`Unsupported period type: ${period}`)
}

/**
 * Get start and end dates for a period key
 */
export function getPeriodDates(
  periodKey: string,
  period: string
): { start: Date; end: Date } {
  if (period === 'weekly') {
    // Parse ISO week format: YYYY-WXX
    const [yearStr, weekStr] = periodKey.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)

    // Calculate the date of the first Monday of week 1
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const jan4Day = jan4.getUTCDay() || 7
    const week1Monday = new Date(jan4)
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1)

    // Calculate the Monday of the target week
    const start = new Date(week1Monday)
    start.setUTCDate(start.getUTCDate() + (week - 1) * 7)
    start.setUTCHours(0, 0, 0, 0)

    // Calculate the Sunday of the target week
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    end.setUTCHours(23, 59, 59, 999)

    return { start, end }
  } else if (period === 'monthly') {
    // Parse monthly format: YYYY-MM
    const [yearStr, monthStr] = periodKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10) - 1 // 0-indexed

    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

    // Get last day of month
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

    return { start, end }
  }

  throw new Error(`Unsupported period type: ${period}`)
}

/**
 * Check budget status given current spending and a new transaction amount
 */
export function checkBudgetStatus(
  budget: Budget,
  currentPeriod: BudgetPeriod | null,
  newTransactionAmount: number
): BudgetStatus {
  const currentSpent = currentPeriod?.spent || 0
  const projectedSpent = currentSpent + newTransactionAmount
  const remainingBudget = budget.limitAmount - projectedSpent
  const percentageUsed = Math.round((projectedSpent / budget.limitAmount) * 100)

  let status: 'ok' | 'warning' | 'exceeded'

  if (projectedSpent >= budget.limitAmount) {
    status = 'exceeded'
  } else if (percentageUsed > 80) {
    status = 'warning'
  } else {
    status = 'ok'
  }

  return {
    status,
    currentSpent,
    projectedSpent,
    budgetLimit: budget.limitAmount,
    remainingBudget,
    percentageUsed,
  }
}

/**
 * Determine if the user should be warned about budget status
 */
export function shouldWarnUser(budget: Budget, status: BudgetStatus): boolean {
  if (!budget.isActive) {
    return false
  }

  return status.status === 'warning' || status.status === 'exceeded'
}
