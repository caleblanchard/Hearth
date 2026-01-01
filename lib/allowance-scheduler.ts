import { Frequency } from '@/app/generated/prisma'
import type { AllowanceSchedule } from '@/app/generated/prisma'

/**
 * Calculate the next allowance date based on frequency and schedule parameters
 */
export function getNextAllowanceDate(
  frequency: Frequency,
  fromDate: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  // Create new date to avoid mutating input and normalize to UTC midnight
  const result = new Date(fromDate.getTime())
  result.setUTCHours(0, 0, 0, 0)

  switch (frequency) {
    case Frequency.DAILY: {
      // Return tomorrow
      const tomorrow = new Date(result.getTime())
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      return tomorrow
    }

    case Frequency.WEEKLY: {
      if (dayOfWeek === null || dayOfWeek === undefined) {
        throw new Error('dayOfWeek is required for WEEKLY frequency')
      }
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)')
      }

      // Calculate days until next occurrence of target day
      const currentDay = result.getUTCDay()
      let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7

      // If it's the same day, schedule for next week
      if (daysUntilTarget === 0) {
        daysUntilTarget = 7
      }

      const nextDate = new Date(result.getTime())
      nextDate.setUTCDate(nextDate.getUTCDate() + daysUntilTarget)
      return nextDate
    }

    case Frequency.BIWEEKLY: {
      if (dayOfWeek === null || dayOfWeek === undefined) {
        throw new Error('dayOfWeek is required for BIWEEKLY frequency')
      }
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)')
      }

      // Same as weekly - calculate next occurrence of target day
      const currentDay = result.getUTCDay()
      let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7

      // If it's the same day, schedule for next week
      if (daysUntilTarget === 0) {
        daysUntilTarget = 7
      }

      const nextDate = new Date(result.getTime())
      nextDate.setUTCDate(nextDate.getUTCDate() + daysUntilTarget)
      return nextDate
    }

    case Frequency.MONTHLY: {
      if (dayOfMonth === null || dayOfMonth === undefined) {
        throw new Error('dayOfMonth is required for MONTHLY frequency')
      }
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        throw new Error('dayOfMonth must be between 1 and 31')
      }

      const nextDate = new Date(result.getTime())

      // If current day >= dayOfMonth, move to next month
      if (nextDate.getUTCDate() >= dayOfMonth) {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1)
      }

      // Set to 1st of target month first to avoid date overflow issues
      nextDate.setUTCDate(1)

      // Calculate last day of target month
      const lastDayOfMonth = new Date(
        Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0)
      ).getUTCDate()

      // Set to target day or last day of month, whichever is smaller
      nextDate.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth))

      return nextDate
    }

    case Frequency.CUSTOM:
      throw new Error('CUSTOM frequency not yet supported')

    default:
      throw new Error(`Unsupported frequency: ${frequency}`)
  }
}

/**
 * Determine if an allowance should be processed on the given date
 */
export function shouldProcessAllowance(
  schedule: AllowanceSchedule,
  currentDate: Date
): boolean {
  // Check if schedule is active
  if (!schedule.isActive) {
    return false
  }

  // Check if schedule is paused
  if (schedule.isPaused) {
    return false
  }

  // Normalize dates to midnight UTC for comparison
  const checkDate = new Date(currentDate)
  checkDate.setUTCHours(0, 0, 0, 0)

  // Check if schedule has started
  const startDate = new Date(schedule.startDate)
  startDate.setUTCHours(0, 0, 0, 0)

  // Use timestamp comparison for proper date-only checking
  if (checkDate.getTime() < startDate.getTime()) {
    return false
  }

  // Check if schedule has ended
  if (schedule.endDate) {
    const endDate = new Date(schedule.endDate)
    endDate.setUTCHours(0, 0, 0, 0)
    if (checkDate.getTime() > endDate.getTime()) {
      return false
    }
  }

  // Check if already processed today
  if (schedule.lastProcessedAt) {
    const lastProcessed = new Date(schedule.lastProcessedAt)
    lastProcessed.setUTCHours(0, 0, 0, 0)

    if (isSameDay(lastProcessed, checkDate)) {
      return false
    }
  }

  // Check if today matches the schedule
  switch (schedule.frequency) {
    case Frequency.DAILY:
      return true // Process every day (if not already processed)

    case Frequency.WEEKLY:
      return checkDate.getUTCDay() === schedule.dayOfWeek

    case Frequency.BIWEEKLY:
      // For biweekly, we need to check if it's the correct day
      // and if enough time has passed since last processing
      if (checkDate.getUTCDay() !== schedule.dayOfWeek) {
        return false
      }

      // If never processed, process now
      if (!schedule.lastProcessedAt) {
        return true
      }

      // Check if at least 14 days have passed
      const lastProcessed = new Date(schedule.lastProcessedAt)
      lastProcessed.setUTCHours(0, 0, 0, 0)
      const daysSinceLastProcessed = Math.floor(
        (checkDate.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
      )

      return daysSinceLastProcessed >= 14

    case Frequency.MONTHLY:
      return checkDate.getUTCDate() === schedule.dayOfMonth

    case Frequency.CUSTOM:
      // Not yet supported
      return false

    default:
      return false
  }
}

/**
 * Helper function to check if two dates are the same day (UTC)
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  )
}
