import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { calculateRemainingTime } from '@/lib/screentime-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Validate JSON input
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { memberId, screenTimeTypeId: rawScreenTimeTypeId, amountMinutes, reason } = body;

    if (!memberId || !rawScreenTimeTypeId || amountMinutes === undefined || amountMinutes === 0) {
      return NextResponse.json(
        { error: 'Member ID, screen time type ID, and non-zero amount required' },
        { status: 400 }
      );
    }

    const screenTimeTypeId = sanitizeString(rawScreenTimeTypeId);

    // Verify member belongs to same family
    const targetMember = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyId: true, name: true },
    });

    if (!targetMember || targetMember.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Verify screen time type exists and belongs to family
    const screenTimeType = await prisma.screenTimeType.findFirst({
      where: {
        id: screenTimeTypeId,
        familyId: session.user.familyId,
        isArchived: false,
      },
    });

    if (!screenTimeType) {
      return NextResponse.json(
        { error: 'Screen time type not found' },
        { status: 404 }
      );
    }

    // Verify allowance exists for this member and type
    const allowance = await prisma.screenTimeAllowance.findUnique({
      where: {
        memberId_screenTimeTypeId: {
          memberId,
          screenTimeTypeId,
        },
      },
    });

    if (!allowance) {
      return NextResponse.json(
        { error: 'No screen time allowance configured for this member and type' },
        { status: 400 }
      );
    }

    // Calculate current remaining time for this type
    const currentRemaining = await calculateRemainingTime(memberId, screenTimeTypeId);

    // Validate adjustment amount - prevent negative remaining time
    if (amountMinutes < 0 && Math.abs(amountMinutes) > currentRemaining.remainingMinutes) {
      return NextResponse.json(
        {
          error: 'Insufficient remaining time',
          message: `Cannot remove ${Math.abs(amountMinutes)} minutes. Current remaining: ${currentRemaining.remainingMinutes} minutes for ${screenTimeType.name}.`,
        },
        { status: 400 }
      );
    }

    // Get or create balance (for backward compatibility)
    let balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    if (!balance) {
      const { getWeekStart } = await import('@/lib/screentime-utils');
      const weekStart = await getWeekStart(new Date(), session.user.familyId);
      balance = await prisma.screenTimeBalance.create({
        data: {
          memberId,
          currentBalanceMinutes: 0,
          weekStartDate: weekStart,
        },
      });
    }

    // Calculate new remaining time after adjustment
    const newRemaining = Math.max(0, currentRemaining.remainingMinutes + amountMinutes);

    // Log transaction with screen time type
    await prisma.screenTimeTransaction.create({
      data: {
        memberId,
        type: 'ADJUSTMENT',
        amountMinutes,
        balanceAfter: balance.currentBalanceMinutes, // Keep general balance unchanged
        screenTimeTypeId,
        reason: reason || `Manual adjustment by ${session.user.name}`,
        createdById: session.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_ADJUSTED',
        entityType: 'ScreenTimeTransaction',
        result: 'SUCCESS',
        metadata: {
          targetMemberId: memberId,
          screenTimeTypeId,
          screenTimeTypeName: screenTimeType.name,
          amountMinutes,
          remainingBefore: currentRemaining.remainingMinutes,
          remainingAfter: newRemaining,
          reason,
        },
      },
    });

    // Notify child about screen time adjustment
    const hours = Math.floor(Math.abs(amountMinutes) / 60);
    const mins = Math.abs(amountMinutes) % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const action = amountMinutes > 0 ? 'added' : 'removed';

    await prisma.notification.create({
      data: {
        userId: memberId,
        type: 'SCREENTIME_ADJUSTED',
        title: 'Screen time updated',
        message: `${timeStr} ${action} ${amountMinutes > 0 ? 'to' : 'from'} your ${screenTimeType.name} screen time.${reason ? ` ${reason}` : ''}`,
        actionUrl: '/dashboard/screentime',
        metadata: {
          screenTimeTypeId,
          screenTimeTypeName: screenTimeType.name,
          amountMinutes,
          remainingAfter: newRemaining,
          reason: reason || 'No reason provided',
          adjustedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      remainingMinutes: newRemaining,
      message: `Adjusted ${targetMember.name}'s ${screenTimeType.name} screen time by ${amountMinutes} minutes. New remaining: ${newRemaining} minutes.`,
    });
  } catch (error) {
    logger.error('Screen time adjustment error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust screen time' },
      { status: 500 }
    );
  }
}
