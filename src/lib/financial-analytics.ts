import { CreditTransactionType, SpendingCategory } from '@/app/generated/prisma'

export interface Transaction {
  id: string
  type: CreditTransactionType
  amount: number
  category: SpendingCategory
  createdAt: Date
  memberId?: string
}

export interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  type?: CreditTransactionType
  category?: SpendingCategory
  memberId?: string
}

export interface Analytics {
  totalIncome: number
  totalExpenses: number
  netChange: number
  averageTransaction: number
  transactionCount: number
}

export interface SpendingByCategory {
  REWARDS: number
  SCREEN_TIME: number
  SAVINGS: number
  TRANSFER: number
  OTHER: number
}

export interface TrendPeriod {
  period: string
  income: number
  expenses: number
  net: number
}

export interface SavingsGoal {
  id: string
  targetAmount: number
  currentAmount: number
  createdAt: Date
  deadline: Date | null
}

export interface SavingsProgress {
  progressPercentage: number
  remainingAmount: number
  isOnTrack: boolean | null
  daysRemaining: number | null
  projectedCompletionDate: Date | null
}

/**
 * Filter transactions based on provided criteria
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter((transaction) => {
    // Filter by date range
    if (filters.startDate) {
      const transactionDate = new Date(transaction.createdAt)
      transactionDate.setUTCHours(0, 0, 0, 0)
      const startDate = new Date(filters.startDate)
      startDate.setUTCHours(0, 0, 0, 0)

      if (transactionDate.getTime() < startDate.getTime()) {
        return false
      }
    }

    if (filters.endDate) {
      const transactionDate = new Date(transaction.createdAt)
      transactionDate.setUTCHours(0, 0, 0, 0)
      const endDate = new Date(filters.endDate)
      endDate.setUTCHours(0, 0, 0, 0)

      if (transactionDate.getTime() > endDate.getTime()) {
        return false
      }
    }

    // Filter by type
    if (filters.type && transaction.type !== filters.type) {
      return false
    }

    // Filter by category
    if (filters.category && transaction.category !== filters.category) {
      return false
    }

    // Filter by memberId
    if (filters.memberId && transaction.memberId !== filters.memberId) {
      return false
    }

    return true
  })
}

/**
 * Calculate financial analytics from transactions
 */
export function calculateAnalytics(transactions: Transaction[]): Analytics {
  if (transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netChange: 0,
      averageTransaction: 0,
      transactionCount: 0,
    }
  }

  let totalIncome = 0
  let totalExpenses = 0

  transactions.forEach((transaction) => {
    if (transaction.amount > 0) {
      totalIncome += transaction.amount
    } else {
      totalExpenses += Math.abs(transaction.amount)
    }
  })

  const netChange = totalIncome - totalExpenses
  const averageTransaction =
    transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
    transactions.length

  return {
    totalIncome,
    totalExpenses,
    netChange,
    averageTransaction,
    transactionCount: transactions.length,
  }
}

/**
 * Group spending by category
 */
export function getSpendingByCategory(
  transactions: Transaction[]
): SpendingByCategory {
  const spending: SpendingByCategory = {
    REWARDS: 0,
    SCREEN_TIME: 0,
    SAVINGS: 0,
    TRANSFER: 0,
    OTHER: 0,
  }

  transactions.forEach((transaction) => {
    // Only count negative transactions (expenses)
    if (transaction.amount < 0) {
      spending[transaction.category] += Math.abs(transaction.amount)
    }
  })

  return spending
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
 * Get start of week (Monday) for a given date
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Calculate trends over time (weekly or monthly)
 */
export function getTrends(
  transactions: Transaction[],
  period: 'weekly' | 'monthly'
): TrendPeriod[] {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)

  const periodCount = period === 'weekly' ? 4 : 6
  const trends: TrendPeriod[] = []

  // Generate period keys
  const periodKeys: string[] = []
  for (let i = periodCount - 1; i >= 0; i--) {
    const date = new Date(now)

    if (period === 'weekly') {
      const startOfWeek = getStartOfWeek(date)
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() - i * 7)
      periodKeys.push(getISOWeek(startOfWeek))
    } else {
      date.setUTCMonth(date.getUTCMonth() - i)
      periodKeys.push(
        `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      )
    }
  }

  // Initialize trends for each period
  periodKeys.forEach((key) => {
    trends.push({
      period: key,
      income: 0,
      expenses: 0,
      net: 0,
    })
  })

  // Aggregate transactions into periods
  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.createdAt)
    let periodKey: string

    if (period === 'weekly') {
      periodKey = getISOWeek(transactionDate)
    } else {
      periodKey = `${transactionDate.getUTCFullYear()}-${String(
        transactionDate.getUTCMonth() + 1
      ).padStart(2, '0')}`
    }

    const trend = trends.find((t) => t.period === periodKey)
    if (trend) {
      if (transaction.amount > 0) {
        trend.income += transaction.amount
      } else {
        trend.expenses += Math.abs(transaction.amount)
      }
      trend.net = trend.income - trend.expenses
    }
  })

  return trends
}

/**
 * Calculate savings goal progress and projections
 */
export function calculateSavingsProgress(goal: SavingsGoal): SavingsProgress {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)

  const createdAt = new Date(goal.createdAt)
  createdAt.setUTCHours(0, 0, 0, 0)

  // Calculate progress percentage (cap at 100)
  const progressPercentage = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100)
  )

  // Calculate remaining amount
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount)

  // Calculate days elapsed
  const daysElapsed = Math.max(
    1,
    Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Calculate daily savings rate
  const dailyRate = goal.currentAmount / daysElapsed

  // Calculate projected completion date
  let projectedCompletionDate: Date | null = null
  if (dailyRate > 0 && remainingAmount > 0) {
    const daysNeeded = Math.ceil(remainingAmount / dailyRate)
    projectedCompletionDate = new Date(now)
    projectedCompletionDate.setUTCDate(projectedCompletionDate.getUTCDate() + daysNeeded)
  }

  // Calculate if on track (only if deadline exists)
  let isOnTrack: boolean | null = null
  let daysRemaining: number | null = null

  if (goal.deadline) {
    const deadline = new Date(goal.deadline)
    deadline.setUTCHours(0, 0, 0, 0)

    daysRemaining = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysRemaining > 0 && remainingAmount > 0) {
      const requiredDailyRate = remainingAmount / daysRemaining
      isOnTrack = dailyRate >= requiredDailyRate
    } else if (remainingAmount === 0) {
      isOnTrack = true // Goal already achieved
    } else {
      isOnTrack = false // Deadline passed
    }
  }

  return {
    progressPercentage,
    remainingAmount,
    isOnTrack,
    daysRemaining,
    projectedCompletionDate,
  }
}
