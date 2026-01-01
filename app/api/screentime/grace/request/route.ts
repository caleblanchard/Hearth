import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkGraceEligibility, getOrCreateGraceSettings } from '@/lib/screentime-grace';
import { RepaymentStatus } from '@/app/generated/prisma';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const { reason } = await request.json();

    // Get or create grace settings
    const settings = await getOrCreateGraceSettings(memberId);

    // Check eligibility
    const eligibility = await checkGraceEligibility(memberId, settings);

    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || 'Not eligible for grace period' },
        { status: 400 }
      );
    }

    // If approval required, create pending request
    if (settings.requiresApproval) {
      // Create grace log (pending approval)
      const graceLog = await prisma.gracePeriodLog.create({
        data: {
          memberId,
          minutesGranted: settings.gracePeriodMinutes,
          reason: reason || null,
          repaymentStatus: RepaymentStatus.PENDING,
        },
      });

      // Get member and family info
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      // Notify all parents
      const parents = await prisma.familyMember.findMany({
        where: { familyId: member.familyId, role: 'PARENT' },
      });

      for (const parent of parents) {
        await prisma.notification.create({
          data: {
            userId: parent.id,
            type: 'GRACE_REQUESTED' as any,
            title: 'Grace request pending',
            message: `${member.name} requested grace period${reason ? ': ' + reason : ''}`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        graceLog,
      });
    }

    // No approval needed, grant immediately
    // Create grace log
    const graceLog = await prisma.gracePeriodLog.create({
      data: {
        memberId,
        minutesGranted: settings.gracePeriodMinutes,
        reason: reason || null,
        repaymentStatus: RepaymentStatus.PENDING,
      },
    });

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    if (!balance) {
      return NextResponse.json({ error: 'Balance not found' }, { status: 404 });
    }

    const newBalance = balance.currentBalanceMinutes + settings.gracePeriodMinutes;

    // Create transaction
    await prisma.screenTimeTransaction.create({
      data: {
        memberId,
        type: 'GRACE_BORROWED' as any,
        amountMinutes: settings.gracePeriodMinutes,
        balanceAfter: newBalance,
        reason: 'Grace period granted',
        createdById: memberId,
      },
    });

    // Update balance
    await prisma.screenTimeBalance.update({
      where: { memberId },
      data: { currentBalanceMinutes: newBalance },
    });

    // Get member for notification
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: memberId,
        type: 'GRACE_GRANTED' as any,
        title: 'Grace period granted',
        message: `You received ${settings.gracePeriodMinutes} minutes of grace time`,
      },
    });

    return NextResponse.json({
      success: true,
      graceLog,
      newBalance,
    });
  } catch (error) {
    console.error('Error requesting grace period:', error);
    return NextResponse.json(
      { error: 'Failed to request grace period' },
      { status: 500 }
    );
  }
}
