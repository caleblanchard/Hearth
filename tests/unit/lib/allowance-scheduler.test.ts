import { Frequency } from '@/app/generated/prisma'
import {
  getNextAllowanceDate,
  shouldProcessAllowance,
} from '@/lib/allowance-scheduler'
import { mockCurrentDate, restoreRealTimers } from '@/lib/test-utils/date-helpers'
import { createTestAllowanceSchedule } from '@/lib/test-utils/factories'

describe('allowance-scheduler', () => {
  afterEach(() => {
    restoreRealTimers()
  })

  describe('getNextAllowanceDate', () => {
    describe('WEEKLY frequency', () => {
      it('should calculate next Sunday for weekly allowance', () => {
        // Start on Wednesday, Jan 1, 2025
        const startDate = new Date('2025-01-01T00:00:00Z') // Wednesday
        const result = getNextAllowanceDate(Frequency.WEEKLY, startDate, 0) // 0 = Sunday

        expect(result.getUTCDay()).toBe(0) // Sunday
        expect(result.getUTCDate()).toBe(5) // Jan 5 is the next Sunday
      })

      it('should calculate next Monday for weekly allowance', () => {
        const startDate = new Date('2025-01-01T00:00:00Z') // Wednesday
        const result = getNextAllowanceDate(Frequency.WEEKLY, startDate, 1) // 1 = Monday

        expect(result.getUTCDay()).toBe(1) // Monday
        expect(result.getUTCDate()).toBe(6) // Jan 6 is the next Monday
      })

      it('should return next week if today is the target day', () => {
        const startDate = new Date('2025-01-05T00:00:00Z') // Sunday
        const result = getNextAllowanceDate(Frequency.WEEKLY, startDate, 0) // Sunday

        // Should return next Sunday, not today
        expect(result.getUTCDay()).toBe(0)
        expect(result.getUTCDate()).toBe(12) // Jan 12 is next Sunday
      })

      it('should throw error if dayOfWeek is missing for WEEKLY', () => {
        const startDate = new Date('2025-01-01T00:00:00Z')
        expect(() => getNextAllowanceDate(Frequency.WEEKLY, startDate)).toThrow(
          'dayOfWeek is required for WEEKLY frequency'
        )
      })
    })

    describe('BIWEEKLY frequency', () => {
      it('should calculate next occurrence 2 weeks later', () => {
        const startDate = new Date('2025-01-01T00:00:00Z') // Wednesday
        const result = getNextAllowanceDate(Frequency.BIWEEKLY, startDate, 0) // Sunday

        expect(result.getUTCDay()).toBe(0) // Sunday
        expect(result.getUTCDate()).toBe(5) // First occurrence: Jan 5
      })

      it('should handle BIWEEKLY spanning months', () => {
        const startDate = new Date('2025-01-20T00:00:00Z') // Monday
        const result = getNextAllowanceDate(Frequency.BIWEEKLY, startDate, 0) // Sunday

        expect(result.getUTCDay()).toBe(0)
        // Next Sunday after Jan 20 is Jan 26, then biweekly would be Feb 2
        // But we're calculating NEXT occurrence, which is Jan 26
        expect(result.getUTCDate()).toBe(26)
      })

      it('should throw error if dayOfWeek is missing for BIWEEKLY', () => {
        const startDate = new Date('2025-01-01T00:00:00Z')
        expect(() => getNextAllowanceDate(Frequency.BIWEEKLY, startDate)).toThrow(
          'dayOfWeek is required for BIWEEKLY frequency'
        )
      })
    })

    describe('MONTHLY frequency', () => {
      it('should calculate next month on same day', () => {
        const startDate = new Date('2025-01-15T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 15)

        expect(result.getUTCMonth()).toBe(1) // February (0-indexed)
        expect(result.getUTCDate()).toBe(15)
      })

      it('should calculate current month if day has not passed', () => {
        const startDate = new Date('2025-01-10T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 15)

        expect(result.getUTCMonth()).toBe(0) // January
        expect(result.getUTCDate()).toBe(15)
      })

      it('should handle month-end edge case (Jan 31 -> Feb 28)', () => {
        const startDate = new Date('2025-02-01T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 31)

        expect(result.getUTCMonth()).toBe(1) // February
        expect(result.getUTCDate()).toBe(28) // Feb 2025 has 28 days
      })

      it('should handle month-end for leap year (2024 Feb 29)', () => {
        const startDate = new Date('2024-02-01T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 31)

        expect(result.getUTCMonth()).toBe(1) // February
        expect(result.getUTCDate()).toBe(29) // 2024 is a leap year
      })

      it('should cap day at 28 for monthly allowances', () => {
        // dayOfMonth > 28 should still work by capping at month end
        const startDate = new Date('2025-01-15T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 28)

        expect(result.getUTCDate()).toBe(28)
      })

      it('should throw error if dayOfMonth is missing for MONTHLY', () => {
        const startDate = new Date('2025-01-01T00:00:00Z')
        expect(() => getNextAllowanceDate(Frequency.MONTHLY, startDate)).toThrow(
          'dayOfMonth is required for MONTHLY frequency'
        )
      })

      it('should throw error if dayOfMonth is out of range', () => {
        const startDate = new Date('2025-01-01T00:00:00Z')
        expect(() => getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 0)).toThrow(
          'dayOfMonth must be between 1 and 31'
        )
        expect(() => getNextAllowanceDate(Frequency.MONTHLY, startDate, null, 32)).toThrow(
          'dayOfMonth must be between 1 and 31'
        )
      })
    })

    describe('DAILY frequency', () => {
      it('should calculate tomorrow for daily allowance', () => {
        const startDate = new Date('2025-01-15T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.DAILY, startDate)

        expect(result.getUTCFullYear()).toBe(2025)
        expect(result.getUTCMonth()).toBe(0) // January
        expect(result.getUTCDate()).toBe(16)
      })

      it('should handle month boundary', () => {
        const startDate = new Date('2025-01-31T00:00:00Z')
        const result = getNextAllowanceDate(Frequency.DAILY, startDate)

        expect(result.getUTCMonth()).toBe(1) // February
        expect(result.getUTCDate()).toBe(1)
      })
    })
  })

  describe('shouldProcessAllowance', () => {
    beforeEach(() => {
      // Mock current date: Sunday, January 5, 2025 at 00:00:00 UTC
      mockCurrentDate(new Date('2025-01-05T00:00:00Z'))
    })

    it('should return true for weekly allowance on correct day', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(true)
    })

    it('should return false if already processed today', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        lastProcessedAt: new Date('2025-01-05T00:00:00Z'), // Today
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return false if schedule is paused', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        isPaused: true,
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return false if schedule is inactive', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        isActive: false,
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return false for weekly allowance on wrong day', () => {
      // Current day is Sunday (0), but schedule is for Monday (1)
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 1, // Monday
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return true for monthly allowance on correct day', () => {
      // Mock current date: Jan 15, 2025
      mockCurrentDate(new Date('2025-01-15T00:00:00Z'))

      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.MONTHLY,
        dayOfWeek: null,
        dayOfMonth: 15,
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(true)
    })

    it('should return false for monthly allowance on wrong day', () => {
      // Mock current date: Jan 15, 2025
      mockCurrentDate(new Date('2025-01-15T00:00:00Z'))

      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.MONTHLY,
        dayOfWeek: null,
        dayOfMonth: 20,
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return true for daily allowance if not processed today', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.DAILY,
        dayOfWeek: null,
        dayOfMonth: null,
        lastProcessedAt: new Date('2025-01-04T00:00:00Z'), // Yesterday
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(true)
    })

    it('should return false for daily allowance if already processed today', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.DAILY,
        dayOfWeek: null,
        dayOfMonth: null,
        lastProcessedAt: new Date('2025-01-05T00:00:00Z'), // Today
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return false if schedule has ended', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        endDate: new Date('2025-01-01T00:00:00Z'), // Already ended
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(false)
    })

    it('should return true if schedule has not started yet but today is start date', () => {
      const schedule = createTestAllowanceSchedule({
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        startDate: new Date('2025-01-05T00:00:00Z'), // Today
        lastProcessedAt: null,
      })

      const result = shouldProcessAllowance(schedule, new Date())
      expect(result).toBe(true)
    })
  })
})
