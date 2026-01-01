import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrCreateGraceSettings, checkGraceEligibility } from '@/lib/screentime-grace';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const memberId = queryMemberId || session.user.id;

    // If viewing another member's status, verify permissions
    if (memberId !== session.user.id) {
      // Only parents can view other members' status
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Cannot view other members status' },
          { status: 403 }
        );
      }

      // Verify member belongs to same family
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: 'Cannot view status from other families' },
          { status: 403 }
        );
      }
    }

    // Get settings
    const settings = await getOrCreateGraceSettings(memberId);

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    const currentBalance = balance?.currentBalanceMinutes || 0;

    // Check eligibility
    const eligibility = await checkGraceEligibility(memberId, settings);

    // Determine if low balance warning should be shown
    const lowBalanceWarning = currentBalance < settings.lowBalanceWarningMinutes;

    // Calculate next reset time (start of next day)
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setDate(now.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);

    // Calculate borrowed minutes (sum of PENDING grace periods)
    const borrowedGraceLogs = await prisma.gracePeriodLog.findMany({
      where: {
        memberId,
        repaymentStatus: 'PENDING',
      },
    });
    const borrowedMinutes = borrowedGraceLogs.reduce(
      (sum, log) => sum + log.minutesGranted,
      0
    );

    return NextResponse.json({
      canRequestGrace: eligibility.eligible,
      currentBalance,
      borrowedMinutes,
      lowBalanceWarning,
      remainingDailyRequests: eligibility.remainingDaily,
      remainingWeeklyRequests: eligibility.remainingWeekly,
      nextResetTime: nextReset.toISOString(),
      settings,
    });
  } catch (error) {
    console.error('Error fetching grace status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grace status' },
      { status: 500 }
    );
  }
}
