import {
  getCurrentPeriodKey,
  getPeriodDates,
  checkBudgetStatus,
  shouldWarnUser,
} from '@/lib/budget-tracker'
import { SpendingCategory } from '@/app/generated/prisma'
import { mockCurrentDate, restoreRealTimers } from '@/lib/test-utils/date-helpers'

describe('budget-tracker', () => {
  afterEach(() => {
    restoreRealTimers()
  })

  describe('getCurrentPeriodKey', () => {
    it('should generate weekly period key (ISO week)', () => {
      // Jan 15, 2025 is a Wednesday in week W03
      mockCurrentDate(new Date('2025-01-15T00:00:00Z'))

      const result = getCurrentPeriodKey('weekly')

      expect(result).toBe('2025-W03')
    })

    it('should generate monthly period key', () => {
      mockCurrentDate(new Date('2025-01-15T00:00:00Z'))

      const result = getCurrentPeriodKey('monthly')

      expect(result).toBe('2025-01')
    })

    it('should handle year boundary for weekly periods', () => {
      // Dec 30, 2024 is a Monday, which is in week W01 of 2025
      mockCurrentDate(new Date('2024-12-30T00:00:00Z'))

      const result = getCurrentPeriodKey('weekly')

      expect(result).toBe('2025-W01')
    })

    it('should handle year boundary for monthly periods', () => {
      mockCurrentDate(new Date('2024-12-31T00:00:00Z'))

      const result = getCurrentPeriodKey('monthly')

      expect(result).toBe('2024-12')
    })

    it('should pad month with zero', () => {
      mockCurrentDate(new Date('2025-03-15T00:00:00Z'))

      const result = getCurrentPeriodKey('monthly')

      expect(result).toBe('2025-03')
    })
  })

  describe('getPeriodDates', () => {
    it('should get weekly period start and end dates', () => {
      // Week W03 of 2025 (Jan 13-19)
      const result = getPeriodDates('2025-W03', 'weekly')

      expect(result.start.getUTCDate()).toBe(13) // Monday
      expect(result.start.getUTCDay()).toBe(1) // Monday
      expect(result.end.getUTCDate()).toBe(19) // Sunday
      expect(result.end.getUTCDay()).toBe(0) // Sunday
    })

    it('should get monthly period start and end dates', () => {
      const result = getPeriodDates('2025-01', 'monthly')

      expect(result.start.getUTCFullYear()).toBe(2025)
      expect(result.start.getUTCMonth()).toBe(0) // January
      expect(result.start.getUTCDate()).toBe(1) // First day
      expect(result.end.getUTCDate()).toBe(31) // Last day of January
    })

    it('should handle February in non-leap year', () => {
      const result = getPeriodDates('2025-02', 'monthly')

      expect(result.end.getUTCDate()).toBe(28)
    })

    it('should handle February in leap year', () => {
      const result = getPeriodDates('2024-02', 'monthly')

      expect(result.end.getUTCDate()).toBe(29)
    })

    it('should set time to start of day for start date', () => {
      const result = getPeriodDates('2025-01', 'monthly')

      expect(result.start.getUTCHours()).toBe(0)
      expect(result.start.getUTCMinutes()).toBe(0)
      expect(result.start.getUTCSeconds()).toBe(0)
      expect(result.start.getUTCMilliseconds()).toBe(0)
    })

    it('should set time to end of day for end date', () => {
      const result = getPeriodDates('2025-01', 'monthly')

      expect(result.end.getUTCHours()).toBe(23)
      expect(result.end.getUTCMinutes()).toBe(59)
      expect(result.end.getUTCSeconds()).toBe(59)
      expect(result.end.getUTCMilliseconds()).toBe(999)
    })
  })

  describe('checkBudgetStatus', () => {
    const mockBudget = {
      id: 'budget-1',
      memberId: 'child-1',
      category: 'REWARDS' as SpendingCategory,
      limitAmount: 1000,
      period: 'weekly',
      resetDay: 1, // Monday
      isActive: true,
    }

    const mockPeriod = {
      id: 'period-1',
      budgetId: 'budget-1',
      periodKey: '2025-W03',
      periodStart: new Date('2025-01-13T00:00:00Z'),
      periodEnd: new Date('2025-01-19T23:59:59.999Z'),
      spent: 500,
    }

    it('should return OK status when within budget', () => {
      const result = checkBudgetStatus(mockBudget, mockPeriod, 100)

      expect(result.status).toBe('ok')
      expect(result.currentSpent).toBe(500)
      expect(result.projectedSpent).toBe(600)
      expect(result.budgetLimit).toBe(1000)
      expect(result.remainingBudget).toBe(400)
      expect(result.percentageUsed).toBe(60)
    })

    it('should return WARNING status when approaching limit (>80%)', () => {
      const periodNearLimit = { ...mockPeriod, spent: 850 }
      const result = checkBudgetStatus(mockBudget, periodNearLimit, 0)

      expect(result.status).toBe('warning')
      expect(result.percentageUsed).toBe(85)
    })

    it('should return EXCEEDED status when over budget', () => {
      const periodOverLimit = { ...mockPeriod, spent: 1000 }
      const result = checkBudgetStatus(mockBudget, periodOverLimit, 50)

      expect(result.status).toBe('exceeded')
      expect(result.projectedSpent).toBe(1050)
      expect(result.remainingBudget).toBe(-50)
    })

    it('should handle budget with no current spending', () => {
      const emptyPeriod = { ...mockPeriod, spent: 0 }
      const result = checkBudgetStatus(mockBudget, emptyPeriod, 100)

      expect(result.status).toBe('ok')
      expect(result.currentSpent).toBe(0)
      expect(result.projectedSpent).toBe(100)
      expect(result.percentageUsed).toBe(10)
    })

    it('should handle exactly at budget limit', () => {
      const fullPeriod = { ...mockPeriod, spent: 1000 }
      const result = checkBudgetStatus(mockBudget, fullPeriod, 0)

      expect(result.status).toBe('exceeded')
      expect(result.percentageUsed).toBe(100)
      expect(result.remainingBudget).toBe(0)
    })

    it('should calculate percentage correctly', () => {
      const result = checkBudgetStatus(mockBudget, mockPeriod, 300)

      // (500 + 300) / 1000 = 80%
      expect(result.percentageUsed).toBe(80)
    })
  })

  describe('shouldWarnUser', () => {
    const mockBudget = {
      id: 'budget-1',
      memberId: 'child-1',
      category: 'REWARDS' as SpendingCategory,
      limitAmount: 1000,
      period: 'weekly',
      resetDay: 1,
      isActive: true,
    }

    it('should not warn when budget status is OK', () => {
      const status = {
        status: 'ok' as const,
        currentSpent: 500,
        projectedSpent: 600,
        budgetLimit: 1000,
        remainingBudget: 400,
        percentageUsed: 60,
      }

      const result = shouldWarnUser(mockBudget, status)

      expect(result).toBe(false)
    })

    it('should warn when budget status is WARNING', () => {
      const status = {
        status: 'warning' as const,
        currentSpent: 850,
        projectedSpent: 850,
        budgetLimit: 1000,
        remainingBudget: 150,
        percentageUsed: 85,
      }

      const result = shouldWarnUser(mockBudget, status)

      expect(result).toBe(true)
    })

    it('should warn when budget status is EXCEEDED', () => {
      const status = {
        status: 'exceeded' as const,
        currentSpent: 1050,
        projectedSpent: 1050,
        budgetLimit: 1000,
        remainingBudget: -50,
        percentageUsed: 105,
      }

      const result = shouldWarnUser(mockBudget, status)

      expect(result).toBe(true)
    })

    it('should not warn if budget is inactive', () => {
      const inactiveBudget = { ...mockBudget, isActive: false }
      const status = {
        status: 'exceeded' as const,
        currentSpent: 1050,
        projectedSpent: 1050,
        budgetLimit: 1000,
        remainingBudget: -50,
        percentageUsed: 105,
      }

      const result = shouldWarnUser(inactiveBudget, status)

      expect(result).toBe(false)
    })
  })
})
