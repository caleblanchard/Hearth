import prisma from '@/lib/prisma';
import {
  ScreenTimeGraceSettings,
  GraceRepaymentMode,
  RepaymentStatus,
} from '@/app/generated/prisma';

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
  settings: ScreenTimeGraceSettings
): Promise<{
  eligible: boolean;
  reason?: string;
  remainingDaily: number;
  remainingWeekly: number;
}> {
  // Get current balance
  const balance = await prisma.screenTimeBalance.findUnique({
    where: { memberId },
  });

  if (!balance) {
    return {
      eligible: false,
      reason: 'Balance not found',
      remainingDaily: settings.maxGracePerDay,
      remainingWeekly: settings.maxGracePerWeek,
    };
  }

  // Check if balance is low enough
  if (balance.currentBalanceMinutes >= settings.lowBalanceWarningMinutes) {
    const dailyUses = await countGraceUsesToday(memberId);
    const weeklyUses = await countGraceUsesThisWeek(memberId);

    return {
      eligible: false,
      reason: 'Balance is not low enough',
      remainingDaily: Math.max(0, settings.maxGracePerDay - dailyUses),
      remainingWeekly: Math.max(0, settings.maxGracePerWeek - weeklyUses),
    };
  }

  // Count today's grace uses
  const dailyUses = await countGraceUsesToday(memberId);
  if (dailyUses >= settings.maxGracePerDay) {
    const weeklyUses = await countGraceUsesThisWeek(memberId);
    return {
      eligible: false,
      reason: 'Daily grace limit exceeded',
      remainingDaily: 0,
      remainingWeekly: Math.max(0, settings.maxGracePerWeek - weeklyUses),
    };
  }

  // Count this week's grace uses
  const weeklyUses = await countGraceUsesThisWeek(memberId);
  if (weeklyUses >= settings.maxGracePerWeek) {
    return {
      eligible: false,
      reason: 'Weekly grace limit exceeded',
      remainingDaily: Math.max(0, settings.maxGracePerDay - dailyUses),
      remainingWeekly: 0,
    };
  }

  return {
    eligible: true,
    remainingDaily: Math.max(0, settings.maxGracePerDay - dailyUses),
    remainingWeekly: Math.max(0, settings.maxGracePerWeek - weeklyUses),
  };
}

/**
 * Count grace period uses for today
 */
async function countGraceUsesToday(memberId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await countGraceUses(memberId, today, tomorrow);
}

/**
 * Count grace period uses for this week
 */
async function countGraceUsesThisWeek(memberId: string): Promise<number> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return await countGraceUses(memberId, startOfWeek, endOfWeek);
}

/**
 * Count grace period uses for a time period
 */
export async function countGraceUses(
  memberId: string,
  startDate: Date,
  endDate: Date,
  status: RepaymentStatus = RepaymentStatus.PENDING
): Promise<number> {
  return await prisma.gracePeriodLog.count({
    where: {
      memberId,
      requestedAt: {
        gte: startDate,
        lte: endDate,
      },
      repaymentStatus: status,
    },
  });
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
  // Get all pending grace logs
  const pendingLogs = await prisma.gracePeriodLog.findMany({
    where: {
      memberId,
      repaymentStatus: RepaymentStatus.PENDING,
    },
  });

  if (pendingLogs.length === 0) {
    return { totalRepaid: 0, logsProcessed: 0 };
  }

  // Get grace settings
  const settings = await prisma.screenTimeGraceSettings.findUnique({
    where: { memberId },
  });

  if (!settings) {
    return { totalRepaid: 0, logsProcessed: 0 };
  }

  // Handle based on repayment mode
  if (settings.graceRepaymentMode === GraceRepaymentMode.FORGIVE) {
    // Mark all as forgiven, no deduction
    for (const log of pendingLogs) {
      await prisma.gracePeriodLog.update({
        where: { id: log.id },
        data: {
          repaymentStatus: RepaymentStatus.FORGIVEN,
          repaidAt: new Date(),
        },
      });
    }

    return { totalRepaid: 0, logsProcessed: pendingLogs.length };
  }

  if (settings.graceRepaymentMode === GraceRepaymentMode.DEDUCT_NEXT_WEEK) {
    // Calculate total to deduct
    const totalMinutes = pendingLogs.reduce(
      (sum, log) => sum + log.minutesGranted,
      0
    );

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    if (!balance) {
      return { totalRepaid: 0, logsProcessed: 0 };
    }

    // Create repayment transaction
    const transaction = await prisma.screenTimeTransaction.create({
      data: {
        memberId,
        type: 'GRACE_REPAID',
        amountMinutes: -totalMinutes,
        balanceAfter: balance.currentBalanceMinutes - totalMinutes,
        reason: 'Grace period repayment',
        createdById: memberId,
      },
    });

    // Update balance
    await prisma.screenTimeBalance.update({
      where: { memberId },
      data: {
        currentBalanceMinutes: balance.currentBalanceMinutes - totalMinutes,
      },
    });

    // Update grace logs
    for (const log of pendingLogs) {
      await prisma.gracePeriodLog.update({
        where: { id: log.id },
        data: {
          repaymentStatus: RepaymentStatus.DEDUCTED,
          repaidAt: new Date(),
          relatedTransactionId: transaction.id,
        },
      });
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
): Promise<ScreenTimeGraceSettings> {
  // Try to find existing settings
  const existing = await prisma.screenTimeGraceSettings.findUnique({
    where: { memberId },
  });

  if (existing) {
    return existing;
  }

  // Create default settings
  const defaultSettings = await prisma.screenTimeGraceSettings.create({
    data: {
      memberId,
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
    },
  });

  return defaultSettings;
}
