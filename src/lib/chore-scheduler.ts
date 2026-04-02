type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

/**
 * Calculate next due dates for a chore schedule based on frequency
 * @param frequency - The frequency type (DAILY, WEEKLY, BIWEEKLY, MONTHLY)
 * @param startDate - The start date to calculate from
 * @param days - Number of days to look ahead
 * @param dayOfWeek - Day of week (0-6) for weekly/biweekly schedules
 * @returns Array of due dates
 */
export function getNextDueDates(
  frequency: Frequency,
  startDate: Date,
  days: number,
  dayOfWeek?: number | null
): Date[] {
  const dueDates: Date[] = [];
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  switch (frequency) {
    case 'DAILY':
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dueDates.push(startOfDay(date));
      }
      break;

    case 'WEEKLY':
      if (dayOfWeek == null) break;

      const weeklyDate = new Date(startDate);
      // Find next occurrence of the target day
      while (weeklyDate.getDay() !== dayOfWeek) {
        weeklyDate.setDate(weeklyDate.getDate() + 1);
      }

      while (weeklyDate < endDate) {
        dueDates.push(startOfDay(new Date(weeklyDate)));
        weeklyDate.setDate(weeklyDate.getDate() + 7);
      }
      break;

    case 'BIWEEKLY':
      if (dayOfWeek == null) break;

      const biweeklyDate = new Date(startDate);
      // Find next occurrence of the target day
      while (biweeklyDate.getDay() !== dayOfWeek) {
        biweeklyDate.setDate(biweeklyDate.getDate() + 1);
      }

      while (biweeklyDate < endDate) {
        dueDates.push(startOfDay(new Date(biweeklyDate)));
        biweeklyDate.setDate(biweeklyDate.getDate() + 14);
      }
      break;

    case 'MONTHLY':
      const monthlyDate = new Date(startDate);
      const targetDay = monthlyDate.getDate();

      while (monthlyDate < endDate) {
        dueDates.push(startOfDay(new Date(monthlyDate)));
        // Move to next month, handling month-end edge cases
        monthlyDate.setMonth(monthlyDate.getMonth() + 1);
        // Handle case where target day doesn't exist in next month (e.g., Jan 31 → Feb 31)
        const daysInMonth = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 0).getDate();
        monthlyDate.setDate(Math.min(targetDay, daysInMonth));
      }
      break;

    case 'CUSTOM':
      // Custom cron expressions would need a cron parser library
      // For now, return empty array (can be implemented later with node-cron or similar)
      break;
  }

  return dueDates;
}

/**
 * Get the next assignee for a rotating chore schedule
 * @param assignments - Array of active assignments ordered by rotationOrder
 * @param lastAssignedId - Member ID of the last assigned person (null if no previous instances)
 * @returns Member ID of next assignee
 */
export function getNextAssignee(
  assignments: Array<{ memberId: string; rotationOrder: number | null }>,
  lastAssignedId: string | null
): string | null {
  if (assignments.length === 0) return null;
  if (assignments.length === 1) return assignments[0].memberId;

  // Sort by rotation order
  const sortedAssignments = [...assignments].sort((a, b) =>
    (a.rotationOrder || 0) - (b.rotationOrder || 0)
  );

  // If no previous assignment, start at index 0
  if (!lastAssignedId) {
    return sortedAssignments[0].memberId;
  }

  // Find current assignee's index
  const currentIndex = sortedAssignments.findIndex(a => a.memberId === lastAssignedId);

  // If not found or at end of list, wrap to beginning
  if (currentIndex === -1 || currentIndex === sortedAssignments.length - 1) {
    return sortedAssignments[0].memberId;
  }

  // Return next person in rotation
  return sortedAssignments[currentIndex + 1].memberId;
}

/**
 * Get start of day (00:00:00.000)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if a date falls within a date range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
