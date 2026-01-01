import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { memberId, amountMinutes, reason } = body;

    if (!memberId || amountMinutes === undefined || amountMinutes === 0) {
      return NextResponse.json(
        { error: 'Member ID and non-zero amount required' },
        { status: 400 }
      );
    }

    // Verify member belongs to same family
    const targetMember = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyId: true, name: true },
    });

    if (!targetMember || targetMember.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId },
    });

    if (!balance) {
      return NextResponse.json(
        { error: 'Screen time not configured for this member' },
        { status: 400 }
      );
    }

    // Validate adjustment amount - prevent negative balances
    if (amountMinutes < 0 && Math.abs(amountMinutes) > balance.currentBalanceMinutes) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message: `Cannot remove ${Math.abs(amountMinutes)} minutes. Current balance: ${balance.currentBalanceMinutes} minutes.`,
        },
        { status: 400 }
      );
    }

    const newBalance = Math.max(0, balance.currentBalanceMinutes + amountMinutes);

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
        type: 'ADJUSTMENT',
        amountMinutes,
        balanceAfter: newBalance,
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
          amountMinutes,
          newBalance,
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
        message: `${timeStr} ${action} ${amountMinutes > 0 ? 'to' : 'from'} your screen time balance.${reason ? ` ${reason}` : ''}`,
        actionUrl: '/dashboard/screentime',
        metadata: {
          amountMinutes,
          newBalance,
          reason: reason || 'No reason provided',
          adjustedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      balance: updatedBalance.currentBalanceMinutes,
      message: `Adjusted ${targetMember.name}'s balance by ${amountMinutes} minutes. New balance: ${newBalance} minutes.`,
    });
  } catch (error) {
    console.error('Screen time adjustment error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust screen time' },
      { status: 500 }
    );
  }
}
