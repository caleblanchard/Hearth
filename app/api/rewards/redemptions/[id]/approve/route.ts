import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can approve redemptions
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Get redemption
    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id },
      include: {
        reward: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!redemption) {
      return NextResponse.json(
        { error: 'Redemption not found' },
        { status: 404 }
      );
    }

    if (redemption.reward.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (redemption.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This redemption has already been processed' },
        { status: 400 }
      );
    }

    // Approve redemption
    const approved = await prisma.rewardRedemption.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
      include: {
        reward: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notify child that their reward was approved
    await prisma.notification.create({
      data: {
        userId: redemption.memberId,
        type: 'REWARD_APPROVED',
        title: 'Reward approved!',
        message: `Your reward "${redemption.reward.name}" has been approved!`,
        actionUrl: '/dashboard/rewards/redemptions',
        metadata: {
          redemptionId: id,
          rewardName: redemption.reward.name,
          approvedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      redemption: approved,
      message: `Approved ${redemption.member.name}'s redemption of "${redemption.reward.name}"`,
    });
  } catch (error) {
    logger.error('Approve redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to approve redemption' },
      { status: 500 }
    );
  }
}
