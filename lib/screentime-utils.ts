/**
 * Screen Time Utilities
 * 
 * Helper functions for calculating screen time allowances, remaining time,
 * rollover logic, and week boundaries.
 */

import prisma from '@/lib/prisma';

export enum ScreenTimePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

/**
 * Get the start of the week based on family settings
 */
export async function getWeekStart(date: Date, familyId: string): Promise<Date> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { settings: true },
  });

  const weekStartDay = (family?.settings as any)?.weekStartDay || 'MONDAY';
  
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  
  const dayOfWeek = result.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let daysToSubtract = 0;
  if (weekStartDay === 'SUNDAY') {
    daysToSubtract = dayOfWeek;
  } else if (weekStartDay === 'MONDAY') {
    daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else if (weekStartDay === 'SATURDAY') {
    daysToSubtract = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  }
  
  result.setUTCDate(result.getUTCDate() - daysToSubtract);
  return result;
}

/**
 * Get the start of the day (midnight UTC)
 */
export function getDayStart(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Calculate remaining time for a screen time type
 * Takes into account:
 * - Current period (daily/weekly)
 * - Rollover settings
 * - Rollover cap
 * - Usage in current period
 */
export async function calculateRemainingTime(
  memberId: string,
  screenTimeTypeId: string,
  asOfDate: Date = new Date()
): Promise<{
  remainingMinutes: number;
  usedMinutes: number;
  allowanceMinutes: number;
  rolloverMinutes: number;
  periodStart: Date;
  periodEnd: Date;
}> {
  const allowance = await prisma.screenTimeAllowance.findUnique({
    where: {
      memberId_screenTimeTypeId: {
        memberId,
        screenTimeTypeId,
      },
    },
    include: {
      screenTimeType: true,
    },
  });

  if (!allowance) {
    return {
      remainingMinutes: 0,
      usedMinutes: 0,
      allowanceMinutes: 0,
      rolloverMinutes: 0,
      periodStart: asOfDate,
      periodEnd: asOfDate,
    };
  }

  // Get family ID for week start calculation
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyId: true },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  let periodStart: Date;
  let periodEnd: Date;

  if (allowance.period === ScreenTimePeriod.DAILY) {
    periodStart = getDayStart(asOfDate);
    periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
  } else {
    // WEEKLY
    periodStart = await getWeekStart(asOfDate, member.familyId);
    periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
  }

  // Get all SPENT transactions for this type in the current period
  const spentTransactions = await prisma.screenTimeTransaction.findMany({
    where: {
      memberId,
      screenTimeTypeId,
      type: 'SPENT',
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Get all ADJUSTMENT transactions for this type in the current period
  const adjustmentTransactions = await prisma.screenTimeTransaction.findMany({
    where: {
      memberId,
      screenTimeTypeId,
      type: 'ADJUSTMENT',
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Calculate used minutes (from SPENT transactions)
  const usedMinutes = spentTransactions.reduce((sum, t) => sum + Math.abs(t.amountMinutes), 0);
  
  // Calculate adjustment minutes (positive adjustments add time, negative remove time)
  // Note: amountMinutes is already positive for additions and negative for removals
  const adjustmentMinutes = adjustmentTransactions.reduce((sum, t) => sum + t.amountMinutes, 0);

  // Calculate rollover from previous period
  let rolloverMinutes = 0;
  if (allowance.rolloverEnabled) {
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    if (allowance.period === ScreenTimePeriod.DAILY) {
      previousPeriodStart = new Date(periodStart);
      previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - 1);
      previousPeriodEnd = periodStart;
    } else {
      // WEEKLY
      previousPeriodStart = new Date(periodStart);
      previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - 7);
      previousPeriodEnd = periodStart;
    }

    const previousTransactions = await prisma.screenTimeTransaction.findMany({
      where: {
        memberId,
        screenTimeTypeId,
        type: 'SPENT',
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
    });

    const previousUsed = previousTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amountMinutes),
      0
    );
    const previousRemaining = Math.max(0, allowance.allowanceMinutes - previousUsed);

    rolloverMinutes = previousRemaining;
    if (allowance.rolloverCapMinutes !== null && rolloverMinutes > allowance.rolloverCapMinutes) {
      rolloverMinutes = allowance.rolloverCapMinutes;
    }
  }

  // Calculate remaining: allowance + rollover - used + adjustments
  // Adjustments: positive values add time, negative values remove time
  const remainingMinutes = Math.max(0, allowance.allowanceMinutes + rolloverMinutes - usedMinutes + adjustmentMinutes);

  return {
    remainingMinutes,
    usedMinutes,
    allowanceMinutes: allowance.allowanceMinutes,
    rolloverMinutes,
    periodStart,
    periodEnd,
  };
}

/**
 * Check if a screen time log would exceed the allowance
 */
export async function wouldExceedAllowance(
  memberId: string,
  screenTimeTypeId: string,
  minutesToLog: number,
  asOfDate: Date = new Date()
): Promise<{
  wouldExceed: boolean;
  remainingBefore: number;
  remainingAfter: number;
  allowanceMinutes: number;
  usedMinutes: number;
  rolloverMinutes: number;
}> {
  const current = await calculateRemainingTime(memberId, screenTimeTypeId, asOfDate);
  const remainingAfter = Math.max(0, current.remainingMinutes - minutesToLog);

  return {
    wouldExceed: remainingAfter < 0,
    remainingBefore: current.remainingMinutes,
    remainingAfter,
    allowanceMinutes: current.allowanceMinutes,
    usedMinutes: current.usedMinutes,
    rolloverMinutes: current.rolloverMinutes,
  };
}
