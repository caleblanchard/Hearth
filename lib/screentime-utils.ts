/**
 * Screen Time Utilities
 * 
 * Helper functions for calculating screen time allowances, remaining time,
 * rollover logic, and week boundaries.
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from '@/lib/supabase/server';

export enum ScreenTimePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

/**
 * Get the start of the week based on family settings
 */
export async function getWeekStart(date: Date, familyId: string): Promise<Date> {
  const supabase = await createClient();
  
  const { data: family } = await supabase
    .from('families')
    .select('settings')
    .eq('id', familyId)
    .single();

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
  const supabase = await createClient();
  
  const { data: allowance } = await supabase
    .from('screen_time_allowances')
    .select(`
      *,
      screen_time_type:screen_time_types(*)
    `)
    .eq('member_id', memberId)
    .eq('screen_time_type_id', screenTimeTypeId)
    .maybeSingle();

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
  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('id', memberId)
    .single();

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
    periodStart = await getWeekStart(asOfDate, member.family_id);
    periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
  }

  // Get all SPENT transactions for this type in the current period
  const { data: spentTransactions } = await supabase
    .from('screen_time_transactions')
    .select('*')
    .eq('member_id', memberId)
    .eq('screen_time_type_id', screenTimeTypeId)
    .eq('type', 'SPENT')
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: true });

  // Get all ADJUSTMENT transactions for this type in the current period
  const { data: adjustmentTransactions } = await supabase
    .from('screen_time_transactions')
    .select('*')
    .eq('member_id', memberId)
    .eq('screen_time_type_id', screenTimeTypeId)
    .eq('type', 'ADJUSTMENT')
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: true });

  // Calculate used minutes (from SPENT transactions)
  const usedMinutes = (spentTransactions || []).reduce((sum, t) => sum + Math.abs(t.amount_minutes), 0);
  
  // Calculate adjustment minutes (positive adjustments add time, negative remove time)
  // Note: amount_minutes is already positive for additions and negative for removals
  const adjustmentMinutes = (adjustmentTransactions || []).reduce((sum, t) => sum + t.amount_minutes, 0);

  // Calculate rollover from previous period
  let rolloverMinutes = 0;
  if (allowance.rollover_enabled) {
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

    const { data: previousTransactions } = await supabase
      .from('screen_time_transactions')
      .select('*')
      .eq('member_id', memberId)
      .eq('screen_time_type_id', screenTimeTypeId)
      .eq('type', 'SPENT')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', previousPeriodEnd.toISOString());

    const previousUsed = (previousTransactions || []).reduce(
      (sum, t) => sum + Math.abs(t.amount_minutes),
      0
    );
    const previousRemaining = Math.max(0, allowance.allowance_minutes - previousUsed);

    rolloverMinutes = previousRemaining;
    if (allowance.rollover_cap_minutes !== null && rolloverMinutes > allowance.rollover_cap_minutes) {
      rolloverMinutes = allowance.rollover_cap_minutes;
    }
  }

  // Calculate remaining: allowance + rollover - used + adjustments
  // Adjustments: positive values add time, negative values remove time
  const remainingMinutes = Math.max(0, allowance.allowance_minutes + rolloverMinutes - usedMinutes + adjustmentMinutes);

  return {
    remainingMinutes,
    usedMinutes,
    allowanceMinutes: allowance.allowance_minutes,
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
