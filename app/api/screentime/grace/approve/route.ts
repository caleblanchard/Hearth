import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RepaymentStatus } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can approve grace requests' },
        { status: 403 }
      );
    }

    const { graceLogId, approved } = await request.json();

    // Get grace log
    const graceLog = await prisma.gracePeriodLog.findUnique({
      where: { id: graceLogId },
    });

    if (!graceLog) {
      return NextResponse.json({ error: 'Grace request not found' }, { status: 404 });
    }

    // Get member to verify family ownership
    const member = await prisma.familyMember.findUnique({
      where: { id: graceLog.memberId },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot approve grace requests from other families' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (graceLog.repaymentStatus !== RepaymentStatus.PENDING) {
      return NextResponse.json(
        { error: 'Grace request has already been processed' },
        { status: 400 }
      );
    }

    if (approved) {
      // Approve: grant grace period
      // Get settings
      const settings = await prisma.screenTimeGraceSettings.findUnique({
        where: { memberId: member.id },
      });

      if (!settings) {
        return NextResponse.json(
          { error: 'Grace settings not found' },
          { status: 404 }
        );
      }

      // Get current balance
      const balance = await prisma.screenTimeBalance.findUnique({
        where: { memberId: member.id },
      });

      if (!balance) {
        return NextResponse.json({ error: 'Balance not found' }, { status: 404 });
      }

      const newBalance = balance.currentBalanceMinutes + graceLog.minutesGranted;

      // Create transaction
      await prisma.screenTimeTransaction.create({
        data: {
          memberId: member.id,
          type: 'GRACE_BORROWED' as any,
          amountMinutes: graceLog.minutesGranted,
          balanceAfter: newBalance,
          reason: 'Grace period granted (approved by parent)',
          createdById: session.user.id,
        },
      });

      // Update balance
      await prisma.screenTimeBalance.update({
        where: { memberId: member.id },
        data: { currentBalanceMinutes: newBalance },
      });

      // Update grace log
      await prisma.gracePeriodLog.update({
        where: { id: graceLogId },
        data: {
          approvedById: session.user.id,
        },
      });

      // Notify child (approved)
      await prisma.notification.create({
        data: {
          userId: member.id,
          type: 'GRACE_APPROVED' as any,
          title: 'Grace request approved',
          message: `Your grace period request was approved. You received ${graceLog.minutesGranted} minutes.`,
        },
      });

      return NextResponse.json({
        success: true,
        approved: true,
        newBalance,
      });
    } else {
      // Deny: mark as forgiven (no balance deduction)
      await prisma.gracePeriodLog.update({
        where: { id: graceLogId },
        data: {
          approvedById: session.user.id,
          repaymentStatus: RepaymentStatus.FORGIVEN,
        },
      });

      // Notify child (denied)
      await prisma.notification.create({
        data: {
          userId: member.id,
          type: 'GRACE_DENIED' as any,
          title: 'Grace request denied',
          message: 'Your grace period request was denied.',
        },
      });

      return NextResponse.json({
        success: true,
        approved: false,
      });
    }
  } catch (error) {
    logger.error('Error approving grace period:', error);
    return NextResponse.json(
      { error: 'Failed to process grace approval' },
      { status: 500 }
    );
  }
}
