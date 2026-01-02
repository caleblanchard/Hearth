import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onScreenTimeUpdated } from '@/lib/rules-engine/hooks';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { minutes, deviceType, notes } = await request.json();

    if (!minutes || minutes <= 0) {
      return NextResponse.json(
        { error: 'Minutes must be greater than 0' },
        { status: 400 }
      );
    }

    const { id: memberId } = session.user;

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    if (!balance) {
      return NextResponse.json(
        { error: 'Screen time not configured' },
        { status: 400 }
      );
    }

    const newBalance = Math.max(0, balance.currentBalanceMinutes - minutes);

    // Update balance
    const updatedBalance = await prisma.screenTimeBalance.update({
      where: { memberId },
      data: {
        currentBalanceMinutes: newBalance,
      },
    });

    // Log transaction
    await prisma.screenTimeTransaction.create({
      data: {
        memberId,
        type: 'SPENT',
        amountMinutes: -minutes,
        balanceAfter: newBalance,
        deviceType: deviceType || 'OTHER',
        notes: notes || null,
        createdById: session.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_LOGGED',
        entityType: 'ScreenTimeTransaction',
        result: 'SUCCESS',
        metadata: {
          minutes,
          deviceType,
          newBalance,
        },
      },
    });

    // Trigger rules engine evaluation (async, fire-and-forget)
    try {
      await onScreenTimeUpdated(memberId, session.user.familyId, newBalance);
    } catch (error) {
      console.error('Rules engine hook error:', error);
      // Don't fail the logging if rules engine fails
    }

    return NextResponse.json({
      success: true,
      balance: updatedBalance.currentBalanceMinutes,
      message: `Logged ${minutes} minutes. ${newBalance} minutes remaining.`,
    });
  } catch (error) {
    console.error('Screen time logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log screen time' },
      { status: 500 }
    );
  }
}
