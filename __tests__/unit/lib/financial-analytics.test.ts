import {
  filterTransactions,
  calculateAnalytics,
  calculateSavingsProgress,
  getSpendingByCategory,
  getTrends,
} from '@/lib/financial-analytics'
import { CreditTransactionType, SpendingCategory } from '@/app/generated/prisma'
import { mockCurrentDate, restoreRealTimers } from '@/lib/test-utils/date-helpers'

describe('financial-analytics', () => {
  afterEach(() => {
    restoreRealTimers()
  })

  describe('filterTransactions', () => {
    const mockTransactions = [
      {
        id: '1',
        memberId: 'child-1',
        type: 'BONUS' as CreditTransactionType,
        amount: 100,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        id: '2',
        memberId: 'child-1',
        type: 'DEDUCTION' as CreditTransactionType,
        amount: -50,
        category: 'REWARDS' as SpendingCategory,
        createdAt: new Date('2025-01-10T00:00:00Z'),
      },
      {
        id: '3',
        memberId: 'child-1',
        type: 'CHORE' as CreditTransactionType,
        amount: 75,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-15T00:00:00Z'),
      },
      {
        id: '4',
        memberId: 'child-2',
        type: 'BONUS' as CreditTransactionType,
        amount: 200,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-20T00:00:00Z'),
      },
    ]

    it('should filter transactions by date range', () => {
      const result = filterTransactions(mockTransactions, {
        startDate: new Date('2025-01-08T00:00:00Z'),
        endDate: new Date('2025-01-12T00:00:00Z'),
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should filter transactions by type', () => {
      const result = filterTransactions(mockTransactions, {
        type: 'BONUS',
      })

      expect(result).toHaveLength(2)
      expect(result.every((t) => t.type === 'BONUS')).toBe(true)
    })

    it('should filter transactions by category', () => {
      const result = filterTransactions(mockTransactions, {
        category: 'REWARDS',
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should filter transactions by memberId', () => {
      const result = filterTransactions(mockTransactions, {
        memberId: 'child-2',
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })

    it('should filter with multiple criteria', () => {
      const result = filterTransactions(mockTransactions, {
        memberId: 'child-1',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-11T00:00:00Z'),
      })

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.id)).toEqual(['1', '2'])
    })

    it('should return all transactions when no filters provided', () => {
      const result = filterTransactions(mockTransactions, {})

      expect(result).toHaveLength(4)
    })
  })

  describe('calculateAnalytics', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'BONUS' as CreditTransactionType,
        amount: 100,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        id: '2',
        type: 'CHORE' as CreditTransactionType,
        amount: 75,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-10T00:00:00Z'),
      },
      {
        id: '3',
        type: 'DEDUCTION' as CreditTransactionType,
        amount: -50,
        category: 'REWARDS' as SpendingCategory,
        createdAt: new Date('2025-01-15T00:00:00Z'),
      },
      {
        id: '4',
        type: 'REDEMPTION' as CreditTransactionType,
        amount: -25,
        category: 'REWARDS' as SpendingCategory,
        createdAt: new Date('2025-01-20T00:00:00Z'),
      },
    ]

    it('should calculate total income', () => {
      const result = calculateAnalytics(mockTransactions)

      expect(result.totalIncome).toBe(175) // 100 + 75
    })

    it('should calculate total expenses', () => {
      const result = calculateAnalytics(mockTransactions)

      expect(result.totalExpenses).toBe(75) // 50 + 25 (absolute values)
    })

    it('should calculate net change', () => {
      const result = calculateAnalytics(mockTransactions)

      expect(result.netChange).toBe(100) // 175 - 75
    })

    it('should calculate average transaction amount', () => {
      const result = calculateAnalytics(mockTransactions)

      expect(result.averageTransaction).toBe(62.5) // (100 + 75 + 50 + 25) / 4
    })

    it('should handle empty transaction list', () => {
      const result = calculateAnalytics([])

      expect(result.totalIncome).toBe(0)
      expect(result.totalExpenses).toBe(0)
      expect(result.netChange).toBe(0)
      expect(result.averageTransaction).toBe(0)
    })

    it('should calculate transaction count', () => {
      const result = calculateAnalytics(mockTransactions)

      expect(result.transactionCount).toBe(4)
    })
  })

  describe('getSpendingByCategory', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'DEDUCTION' as CreditTransactionType,
        amount: -50,
        category: 'REWARDS' as SpendingCategory,
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        id: '2',
        type: 'REDEMPTION' as CreditTransactionType,
        amount: -30,
        category: 'REWARDS' as SpendingCategory,
        createdAt: new Date('2025-01-10T00:00:00Z'),
      },
      {
        id: '3',
        type: 'DEDUCTION' as CreditTransactionType,
        amount: -20,
        category: 'SCREEN_TIME' as SpendingCategory,
        createdAt: new Date('2025-01-15T00:00:00Z'),
      },
      {
        id: '4',
        type: 'BONUS' as CreditTransactionType,
        amount: 100,
        category: 'OTHER' as SpendingCategory,
        createdAt: new Date('2025-01-20T00:00:00Z'),
      },
    ]

    it('should group spending by category', () => {
      const result = getSpendingByCategory(mockTransactions)

      expect(result).toEqual({
        REWARDS: 80,
        SCREEN_TIME: 20,
        SAVINGS: 0,
        TRANSFER: 0,
        OTHER: 0,
      })
    })

    it('should only count negative transactions (expenses)', () => {
      const result = getSpendingByCategory(mockTransactions)

      // BONUS transaction should not be counted
      expect(result.OTHER).toBe(0)
    })

    it('should handle empty transaction list', () => {
      const result = getSpendingByCategory([])

      expect(result).toEqual({
        REWARDS: 0,
        SCREEN_TIME: 0,
        SAVINGS: 0,
        TRANSFER: 0,
        OTHER: 0,
      })
    })

    it('should use absolute values for spending amounts', () => {
      const result = getSpendingByCategory(mockTransactions)

      expect(result.REWARDS).toBe(80) // Not -80
    })
  })

  describe('getTrends', () => {
    beforeEach(() => {
      // Mock current date: Jan 31, 2025
      mockCurrentDate(new Date('2025-01-31T00:00:00Z'))
    })

    const mockTransactions = [
      {
        id: '1',
        type: 'BONUS' as CreditTransactionType,
        amount: 100,
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        id: '2',
        type: 'CHORE' as CreditTransactionType,
        amount: 50,
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        id: '3',
        type: 'DEDUCTION' as CreditTransactionType,
        amount: -30,
        createdAt: new Date('2025-01-12T00:00:00Z'),
      },
      {
        id: '4',
        type: 'BONUS' as CreditTransactionType,
        amount: 75,
        createdAt: new Date('2025-01-19T00:00:00Z'),
      },
      {
        id: '5',
        type: 'REDEMPTION' as CreditTransactionType,
        amount: -20,
        createdAt: new Date('2025-01-26T00:00:00Z'),
      },
    ]

    it('should calculate weekly trends for last 4 weeks', () => {
      const result = getTrends(mockTransactions, 'weekly')

      expect(result).toHaveLength(4)
      expect(result[0].period).toMatch(/2025-W/) // ISO week format
      expect(result[0]).toHaveProperty('income')
      expect(result[0]).toHaveProperty('expenses')
      expect(result[0]).toHaveProperty('net')
    })

    it('should calculate weekly income correctly', () => {
      const result = getTrends(mockTransactions, 'weekly')

      // Week with Jan 19 should have income of 75
      const weekWithJan19 = result.find((w) => w.period === '2025-W03')
      expect(weekWithJan19?.income).toBe(75)
    })

    it('should calculate weekly expenses correctly', () => {
      const result = getTrends(mockTransactions, 'weekly')

      // Week with Jan 12 should have expenses of 30
      const weekWithJan12 = result.find((w) => w.period === '2025-W02')
      expect(weekWithJan12?.expenses).toBe(30)
    })

    it('should calculate monthly trends for last 6 months', () => {
      const result = getTrends(mockTransactions, 'monthly')

      expect(result).toHaveLength(6)
      expect(result[0].period).toMatch(/\d{4}-\d{2}/) // YYYY-MM format
    })

    it('should handle empty transaction list', () => {
      const result = getTrends([], 'weekly')

      expect(result).toHaveLength(4)
      expect(result.every((w) => w.income === 0 && w.expenses === 0)).toBe(true)
    })
  })

  describe('calculateSavingsProgress', () => {
    beforeEach(() => {
      // Mock current date: Jan 15, 2025
      mockCurrentDate(new Date('2025-01-15T00:00:00Z'))
    })

    it('should calculate progress percentage', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 250,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: new Date('2025-03-01T00:00:00Z'),
      }

      const result = calculateSavingsProgress(goal)

      expect(result.progressPercentage).toBe(25)
    })

    it('should calculate remaining amount', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 350,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: null,
      }

      const result = calculateSavingsProgress(goal)

      expect(result.remainingAmount).toBe(650)
    })

    it('should determine if goal is on track with deadline', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 500,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: new Date('2025-03-01T00:00:00Z'), // 45 days remaining
      }

      const result = calculateSavingsProgress(goal)

      // 14 days elapsed, 500 saved = ~35.7/day
      // 45 days remaining, 500 needed = ~11.1/day
      // On track since daily rate exceeds needed rate
      expect(result.isOnTrack).toBe(true)
    })

    it('should determine if goal is behind schedule', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 100,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: new Date('2025-01-31T00:00:00Z'), // 16 days remaining
      }

      const result = calculateSavingsProgress(goal)

      // 14 days elapsed, 100 saved = ~7.1/day
      // 16 days remaining, 900 needed = ~56.25/day
      // Behind since daily rate is less than needed
      expect(result.isOnTrack).toBe(false)
    })

    it('should handle goals without deadline', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 300,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: null,
      }

      const result = calculateSavingsProgress(goal)

      expect(result.isOnTrack).toBeNull()
      expect(result.daysRemaining).toBeNull()
    })

    it('should calculate projected completion date', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 350,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: null,
      }

      const result = calculateSavingsProgress(goal)

      // 14 days elapsed, 350 saved = 25/day
      // 650 remaining / 25 per day = 26 days
      // Jan 15 + 26 days = Feb 10
      expect(result.projectedCompletionDate).toBeTruthy()
      expect(result.projectedCompletionDate?.getUTCDate()).toBe(10)
      expect(result.projectedCompletionDate?.getUTCMonth()).toBe(1) // February
    })

    it('should handle goal with zero current amount', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: new Date('2025-03-01T00:00:00Z'),
      }

      const result = calculateSavingsProgress(goal)

      expect(result.progressPercentage).toBe(0)
      expect(result.projectedCompletionDate).toBeNull() // Can't project with 0 progress
    })

    it('should cap progress percentage at 100', () => {
      const goal = {
        id: '1',
        targetAmount: 1000,
        currentAmount: 1200, // Over target
        createdAt: new Date('2025-01-01T00:00:00Z'),
        deadline: null,
      }

      const result = calculateSavingsProgress(goal)

      expect(result.progressPercentage).toBe(100)
    })
  })
})
