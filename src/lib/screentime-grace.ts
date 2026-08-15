import { createClient } from '@/lib/supabase/server';

type GraceRepaymentMode = 'FORGIVE' | 'DEDUCT_NEXT_WEEK' | 'EARN_BACK';
type RepaymentStatus = 'PENDING' | 'FORGIVEN' | 'DEDUCTED' | 'EARNED_BACK';

/**
 * Check if user is eligible for grace period
 * 
 * Determines if a member can request additional screen time through the grace period
 * feature. Checks:
 * - Current balance must be below the low balance warning threshold
 * - Daily grace limit must not be exceeded
 * - Weekly grace limit must not be exceeded
 * 
 * @param memberId - The ID of the family member to check
 * @param settings - The grace period settings for the member
 * @returns Object containing:
 *   - eligible: Whether the member can request grace time
 *   - reason: Explanation if not eligible
 *   - remainingDaily: Number of daily grace requests remaining
 *   - remainingWeekly: Number of weekly grace requests remaining
 * 
 * @example
 * ```typescript
 * const eligibility = await checkGraceEligibility(memberId, settings);
 * if (eligibility.eligible) {
 *   // Allow grace period request
 * } else {
 *   // Show reason: eligibility.reason
 * }
 * ```
 */
export async function checkGraceEligibility(
  memberId: string,
  settings: any
): Promise<{
  eligible: boolean;
  reason?: string;
  remainingDaily: number;
  remainingWeekly: number;
}> {
  const supabase = await createClient();
  
  // Get current balance
  const { data: balance } = await supabase
    .from('screen_time_balances')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();

  if (!balance) {
    return {
      eligible: false,
      reason: 'Balance not found',
      remainingDaily: settings.grace_period_minutes,
      remainingWeekly: settings.max_grace_per_week,
    };
  }

  // Fetch this week's pending grace logs once and derive today's and the
  // week's counts in memory (today's window is a subset of the week's), so
  // eligibility checks run a single query instead of up to five.
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const { data: weekLogs } = await supabase
    .from('grace_period_logs')
    .select('*')
    .eq('member_id', memberId)
    .gte('requested_at', startOfWeek.toISOString())
    .lte('requested_at', endOfWeek.toISOString())
    .eq('repayment_status', 'PENDING');

  const todayStartMs = startOfToday.getTime();
  const dailyUses = (weekLogs ?? []).filter((log) => {
    const requestedAt = new Date(log.requested_at);
    return requestedAt.getTime() >= todayStartMs;
  }).length;
  const weeklyUses = weekLogs?.length ?? 0;

  // Check if balance is low enough
  if (balance.current_balance_minutes >= settings.low_balance_warning_minutes) {
    // Ensure we don't return negative remaining counts
    const remainingDaily = Math.max(0, settings.max_grace_per_day - dailyUses);
    const remainingWeekly = Math.max(0, settings.max_grace_per_week - weeklyUses);

    return {
      eligible: false,
      reason: 'Balance is not low enough',
      remainingDaily: isNaN(remainingDaily) ? 0 : remainingDaily,
      remainingWeekly: isNaN(remainingWeekly) ? 0 : remainingWeekly,
    };
  }

  if (dailyUses >= settings.max_grace_per_day) {
    const remainingWeekly = Math.max(0, settings.max_grace_per_week - weeklyUses);

    return {
      eligible: false,
      reason: 'Daily grace limit exceeded',
      remainingDaily: 0,
      remainingWeekly: isNaN(remainingWeekly) ? 0 : remainingWeekly,
    };
  }

  if (weeklyUses >= settings.max_grace_per_week) {
    const remainingDaily = Math.max(0, settings.max_grace_per_day - dailyUses);

    return {
      eligible: false,
      reason: 'Weekly grace limit exceeded',
      remainingDaily: isNaN(remainingDaily) ? 0 : remainingDaily,
      remainingWeekly: 0,
    };
  }

  const remainingDaily = Math.max(0, settings.max_grace_per_day - dailyUses);
  const remainingWeekly = Math.max(0, settings.max_grace_per_week - weeklyUses);

  return {
    eligible: true,
    remainingDaily: isNaN(remainingDaily) ? 0 : remainingDaily,
    remainingWeekly: isNaN(remainingWeekly) ? 0 : remainingWeekly,
  };
}

/**
 * Count grace period uses for a time period
 */
export async function countGraceUses(
  memberId: string,
  startDate: Date,
  endDate: Date,
  status: RepaymentStatus = 'PENDING'
): Promise<number> {
  const supabase = await createClient();
  
  const { count } = await supabase
    .from('grace_period_logs')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .gte('requested_at', startDate.toISOString())
    .lte('requested_at', endDate.toISOString())
    .eq('repayment_status', status);

  return count || 0;
}

/**
 * Process grace period repayment during weekly reset
 * 
 * This function handles the repayment of borrowed screen time grace periods based on
 * the member's grace repayment mode setting:
 * - FORGIVE: Marks all pending grace logs as forgiven (no deduction)
 * - DEDUCT_NEXT_WEEK: Deducts the total borrowed minutes from the current balance
 * - EARN_BACK: Tracks as pending for future integration with chore completion
 * 
 * @param memberId - The ID of the family member whose grace periods should be processed
 * @returns Object containing:
 *   - totalRepaid: Total minutes repaid (0 for FORGIVE mode)
 *   - logsProcessed: Number of grace period logs processed
 * 
 * @example
 * ```typescript
 * const result = await processGraceRepayment(memberId);
 * console.log(`Processed ${result.logsProcessed} logs, repaid ${result.totalRepaid} minutes`);
 * ```
 */
export async function processGraceRepayment(
  memberId: string
): Promise<{
  totalRepaid: number;
  logsProcessed: number;
}> {
  const supabase = await createClient();
  
  // Get all pending grace logs
  const { data: pendingLogs } = await supabase
    .from('grace_period_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('repayment_status', 'PENDING');

  if (!pendingLogs || pendingLogs.length === 0) {
    return { totalRepaid: 0, logsProcessed: 0 };
  }

  // Get grace settings
  const { data: settings } = await supabase
    .from('screen_time_grace_settings')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();

  if (!settings) {
    return { totalRepaid: 0, logsProcessed: 0 };
  }

  // Handle based on repayment mode
  if (settings.grace_repayment_mode === 'FORGIVE') {
    // Mark all as forgiven, no deduction
    for (const log of pendingLogs) {
      await supabase
        .from('grace_period_logs')
        .update({
          repayment_status: 'FORGIVEN',
          repaid_at: new Date().toISOString(),
        })
        .eq('id', log.id);
    }

    return { totalRepaid: 0, logsProcessed: pendingLogs.length };
  }

  if (settings.grace_repayment_mode === 'DEDUCT_NEXT_WEEK') {
    // Calculate total to deduct
    const totalMinutes = pendingLogs.reduce(
      (sum, log) => sum + log.minutes_granted,
      0
    );

    // Get current balance
    const { data: balance } = await supabase
      .from('screen_time_balances')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (!balance) {
      return { totalRepaid: 0, logsProcessed: 0 };
    }

    // Create repayment transaction
    const { data: transaction } = await supabase
      .from('screen_time_transactions')
      .insert({
        member_id: memberId,
        type: 'GRACE_REPAID',
        amount_minutes: -totalMinutes,
        balance_after: balance.current_balance_minutes - totalMinutes,
        reason: 'Grace period repayment',
        created_by_id: memberId,
      })
      .select()
      .single();

    // Update balance
    await supabase
      .from('screen_time_balances')
      .update({
        current_balance_minutes: balance.current_balance_minutes - totalMinutes,
      })
      .eq('member_id', memberId);

    // Update grace logs
    for (const log of pendingLogs) {
      await supabase
        .from('grace_period_logs')
        .update({
          repayment_status: 'DEDUCTED',
          repaid_at: new Date().toISOString(),
          related_transaction_id: transaction?.id,
        })
        .eq('id', log.id);
    }

    return { totalRepaid: totalMinutes, logsProcessed: pendingLogs.length };
  }

  // EARN_BACK mode - for now, just track them as pending
  // This would need integration with chore completion logic
  return { totalRepaid: 0, logsProcessed: 0 };
}

/**
 * Get or create default grace settings
 */
export async function getOrCreateGraceSettings(
  memberId: string
): Promise<any> {
  const supabase = await createClient();
  
  // Try to find existing settings
  const { data: existing } = await supabase
    .from('screen_time_grace_settings')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create default settings
  const { data: defaultSettings } = await supabase
    .from('screen_time_grace_settings')
    .insert({
      member_id: memberId,
      grace_period_minutes: 15,
      max_grace_per_day: 1,
      max_grace_per_week: 3,
      grace_repayment_mode: 'DEDUCT_NEXT_WEEK',
      low_balance_warning_minutes: 10,
      requires_approval: false,
    })
    .select()
    .single();

  return defaultSettings;
}
