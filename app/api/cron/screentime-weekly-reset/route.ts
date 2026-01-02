import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processGraceRepayment } from '@/lib/screentime-grace';
import { logger } from '@/lib/logger';

/**
 * Weekly Screen Time Reset Cron Job
 *
 * This endpoint should be called weekly (typically Sunday at midnight) to:
 * 1. Reset screen time balances to weekly allocations
 * 2. Process grace period repayments based on repayment mode
 * 3. Create audit logs for the reset
 *
 * Expected to be triggered by a cron service (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let balancesReset = 0;
    let graceRepaymentsProcessed = 0;
    let totalGraceMinutesRepaid = 0;
    let errors = 0;

    // Get all screen time balances
    const balances = await prisma.screenTimeBalance.findMany({
      include: {
        member: {
          select: {
            id: true,
            name: true,
            familyId: true,
          },
        },
      },
    });

    // Process each balance
    for (const balance of balances) {
      try {
        await prisma.$transaction(async (tx) => {
          // Process grace repayments BEFORE resetting balance
          const repaymentResult = await processGraceRepayment(balance.memberId);
          if (repaymentResult.logsProcessed > 0) {
            graceRepaymentsProcessed += repaymentResult.logsProcessed;
            totalGraceMinutesRepaid += repaymentResult.totalRepaid;
          }

          // Get updated balance after repayment (might have been deducted)
          const updatedBalance = await tx.screenTimeBalance.findUnique({
            where: { memberId: balance.memberId },
          });

          if (!updatedBalance) {
            throw new Error(`Balance not found for member ${balance.memberId}`);
          }

          // Reset to weekly allocation
          await tx.screenTimeBalance.update({
            where: { memberId: balance.memberId },
            data: {
              currentBalanceMinutes: updatedBalance.weeklyAllocationMinutes,
              lastResetAt: now,
            },
          });

          // Create transaction record for the reset
          await tx.screenTimeTransaction.create({
            data: {
              memberId: balance.memberId,
              type: 'ALLOCATION',
              amountMinutes: updatedBalance.weeklyAllocationMinutes,
              balanceAfter: updatedBalance.weeklyAllocationMinutes,
              reason: 'Weekly reset',
              createdById: balance.memberId, // System reset
            },
          });

          // Create audit log
          await tx.auditLog.create({
            data: {
              familyId: balance.member.familyId,
              memberId: balance.memberId,
              action: 'SCREENTIME_RESET',
              entityType: 'SCREEN_TIME',
              result: 'SUCCESS',
              metadata: {
                memberName: balance.member.name,
                weeklyAllocationMinutes: updatedBalance.weeklyAllocationMinutes,
                previousBalance: balance.currentBalanceMinutes,
                graceRepaymentsProcessed: repaymentResult.logsProcessed,
                graceMinutesRepaid: repaymentResult.totalRepaid,
              },
            },
          });

          // Create notification for the reset
          await tx.notification.create({
            data: {
              userId: balance.memberId,
              type: 'SCREEN_TIME_RESET' as any,
              title: 'Screen Time Reset',
              message: `Your screen time has been reset to ${updatedBalance.weeklyAllocationMinutes} minutes for the week!`,
              isRead: false,
            },
          });

          balancesReset++;
        });
      } catch (error) {
        logger.error('Error processing screen time reset for member', {
          memberId: balance.memberId,
          memberName: balance.member.name,
          error,
        });
        errors++;
      }
    }

    const response = {
      success: true,
      balancesReset,
      graceRepaymentsProcessed,
      totalGraceMinutesRepaid,
      errors,
      totalMembers: balances.length,
      timestamp: now.toISOString(),
    };

    logger.info('Screen time weekly reset completed', response);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Screen time weekly reset cron error', error);
    return NextResponse.json(
      {
        error: 'Failed to process weekly screen time reset',
      },
      { status: 500 }
    );
  }
}
