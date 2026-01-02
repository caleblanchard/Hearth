import {
  getNextDueDates,
  getNextAssignee,
  startOfDay,
  endOfDay,
  isDateInRange,
  isSameDay,
} from '@/lib/chore-scheduler'

describe('lib/chore-scheduler.ts', () => {
  describe('getNextDueDates', () => {
    const baseDate = new Date('2025-01-15T10:00:00Z') // Wednesday

    describe('DAILY frequency', () => {
      it('should return dates for next 7 days', () => {
        const dates = getNextDueDates('DAILY', baseDate, 7, null)

        expect(dates).toHaveLength(7)
        expect(dates[0].getDate()).toBe(15)
        expect(dates[6].getDate()).toBe(21)
      })

      it('should return dates starting from the given date', () => {
        const dates = getNextDueDates('DAILY', baseDate, 3, null)

        expect(dates).toHaveLength(3)
        expect(isSameDay(dates[0], baseDate)).toBe(true)
      })
    })

    describe('WEEKLY frequency', () => {
      it('should return next occurrence of target day', () => {
        // Wednesday (3) to next Monday (1)
        const dates = getNextDueDates('WEEKLY', baseDate, 14, 1)

        expect(dates.length).toBeGreaterThan(0)
        expect(dates[0].getDay()).toBe(1) // Monday
      })

      it('should return multiple weekly occurrences', () => {
        // Wednesday to next Sundays (0)
        const dates = getNextDueDates('WEEKLY', baseDate, 21, 0)

        expect(dates.length).toBeGreaterThan(0)
        dates.forEach((date) => {
          expect(date.getDay()).toBe(0) // All should be Sunday
        })
      })

      it('should return empty array if dayOfWeek is null', () => {
        const dates = getNextDueDates('WEEKLY', baseDate, 14, null)

        expect(dates).toEqual([])
      })
    })

    describe('BIWEEKLY frequency', () => {
      it('should return biweekly occurrences', () => {
        const dates = getNextDueDates('BIWEEKLY', baseDate, 30, 1)

        expect(dates.length).toBeGreaterThan(0)
        // Check that dates are approximately 14 days apart
        if (dates.length > 1) {
          const daysBetween = Math.floor(
            (dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
          )
          expect(daysBetween).toBe(14)
        }
      })

      it('should return empty array if dayOfWeek is null', () => {
        const dates = getNextDueDates('BIWEEKLY', baseDate, 30, null)

        expect(dates).toEqual([])
      })
    })

    describe('MONTHLY frequency', () => {
      it('should return monthly occurrences', () => {
        const dates = getNextDueDates('MONTHLY', baseDate, 90, null)

        expect(dates.length).toBeGreaterThan(0)
        dates.forEach((date) => {
          expect(date.getDate()).toBe(15)
        })
      })

      it('should handle month-end edge cases', () => {
        // January 31st
        const jan31 = new Date('2025-01-31T10:00:00Z')
        jan31.setDate(31) // Ensure it's the 31st
        const dates = getNextDueDates('MONTHLY', jan31, 90, null)

        expect(dates.length).toBeGreaterThan(0)
        // February doesn't have 31 days, so should use last day
        const febDate = dates.find((d) => d.getMonth() === 1) // February is month 1
        if (febDate) {
          expect(febDate.getDate()).toBeLessThanOrEqual(28) // Feb has max 28 days in 2025
        }
      })

      it('should handle day 31 in months with fewer days', () => {
        // Use a date that's the 31st
        const date31 = new Date('2025-01-31T10:00:00Z')
        const dates = getNextDueDates('MONTHLY', date31, 90, null)

        expect(dates.length).toBeGreaterThan(0)
        // All dates should be valid (last day of month if month doesn't have 31 days)
        dates.forEach((date) => {
          const lastDayOfMonth = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
          ).getDate()
          expect(date.getDate()).toBeLessThanOrEqual(lastDayOfMonth)
        })
      })
    })

    describe('CUSTOM frequency', () => {
      it('should return empty array for CUSTOM (not yet implemented)', () => {
        const dates = getNextDueDates('CUSTOM', baseDate, null, null, 30)

        expect(dates).toEqual([])
      })
    })
  })

  describe('getNextAssignee', () => {
    it('should return null if no assignments', () => {
      const result = getNextAssignee([], null)

      expect(result).toBeNull()
    })

    it('should return single assignee if only one', () => {
      const assignments = [{ memberId: 'child-1', rotationOrder: 0 }]

      const result = getNextAssignee(assignments, null)

      expect(result).toBe('child-1')
    })

    it('should return first assignee if no previous assignment', () => {
      const assignments = [
        { memberId: 'child-1', rotationOrder: 0 },
        { memberId: 'child-2', rotationOrder: 1 },
        { memberId: 'child-3', rotationOrder: 2 },
      ]

      const result = getNextAssignee(assignments, null)

      expect(result).toBe('child-1')
    })

    it('should return next assignee in rotation', () => {
      const assignments = [
        { memberId: 'child-1', rotationOrder: 0 },
        { memberId: 'child-2', rotationOrder: 1 },
        { memberId: 'child-3', rotationOrder: 2 },
      ]

      const result = getNextAssignee(assignments, 'child-1')

      expect(result).toBe('child-2')
    })

    it('should wrap to beginning after last assignee', () => {
      const assignments = [
        { memberId: 'child-1', rotationOrder: 0 },
        { memberId: 'child-2', rotationOrder: 1 },
        { memberId: 'child-3', rotationOrder: 2 },
      ]

      const result = getNextAssignee(assignments, 'child-3')

      expect(result).toBe('child-1')
    })

    it('should handle assignee not in list (wrap to beginning)', () => {
      const assignments = [
        { memberId: 'child-1', rotationOrder: 0 },
        { memberId: 'child-2', rotationOrder: 1 },
      ]

      const result = getNextAssignee(assignments, 'child-unknown')

      expect(result).toBe('child-1')
    })

    it('should sort by rotationOrder', () => {
      const assignments = [
        { memberId: 'child-3', rotationOrder: 2 },
        { memberId: 'child-1', rotationOrder: 0 },
        { memberId: 'child-2', rotationOrder: 1 },
      ]

      const result = getNextAssignee(assignments, 'child-1')

      expect(result).toBe('child-2')
    })

    it('should handle null rotationOrder (treat as 0)', () => {
      const assignments = [
        { memberId: 'child-1', rotationOrder: null },
        { memberId: 'child-2', rotationOrder: 1 },
      ]

      const result = getNextAssignee(assignments, null)

      expect(result).toBe('child-1')
    })
  })

  describe('startOfDay', () => {
    it('should set time to 00:00:00.000', () => {
      const date = new Date('2025-01-15T14:30:45.123Z')
      const result = startOfDay(date)

      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })

    it('should preserve date', () => {
      const date = new Date('2025-01-15T14:30:45Z')
      const result = startOfDay(date)

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(15)
    })
  })

  describe('endOfDay', () => {
    it('should set time to 23:59:59.999', () => {
      const date = new Date('2025-01-15T14:30:45.123Z')
      const result = endOfDay(date)

      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
      expect(result.getMilliseconds()).toBe(999)
    })

    it('should preserve date', () => {
      const date = new Date('2025-01-15T14:30:45Z')
      const result = endOfDay(date)

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(15)
    })
  })

  describe('isDateInRange', () => {
    it('should return true if date is within range', () => {
      const date = new Date('2025-01-15')
      const start = new Date('2025-01-10')
      const end = new Date('2025-01-20')

      expect(isDateInRange(date, start, end)).toBe(true)
    })

    it('should return true if date equals start date', () => {
      const date = new Date('2025-01-10')
      const start = new Date('2025-01-10')
      const end = new Date('2025-01-20')

      expect(isDateInRange(date, start, end)).toBe(true)
    })

    it('should return true if date equals end date', () => {
      const date = new Date('2025-01-20')
      const start = new Date('2025-01-10')
      const end = new Date('2025-01-20')

      expect(isDateInRange(date, start, end)).toBe(true)
    })

    it('should return false if date is before start', () => {
      const date = new Date('2025-01-05')
      const start = new Date('2025-01-10')
      const end = new Date('2025-01-20')

      expect(isDateInRange(date, start, end)).toBe(false)
    })

    it('should return false if date is after end', () => {
      const date = new Date('2025-01-25')
      const start = new Date('2025-01-10')
      const end = new Date('2025-01-20')

      expect(isDateInRange(date, start, end)).toBe(false)
    })
  })

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-01-15T20:00:00Z')

      expect(isSameDay(date1, date2)).toBe(true)
    })

    it('should return false for different days', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-01-16T10:00:00Z')

      expect(isSameDay(date1, date2)).toBe(false)
    })

    it('should return false for different months', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-02-15T10:00:00Z')

      expect(isSameDay(date1, date2)).toBe(false)
    })

    it('should return false for different years', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2026-01-15T10:00:00Z')

      expect(isSameDay(date1, date2)).toBe(false)
    })
  })
})
