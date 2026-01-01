import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can reject redemptions
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const { reason } = await request.json();

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
        creditTransaction: true,
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

    // Reject redemption and refund credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Reject the redemption
      const rejected = await tx.rewardRedemption.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedById: session.user.id,
          rejectionReason: reason || 'No reason provided',
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

      // Refund the credits
      if (redemption.creditTransaction) {
        const creditBalance = await tx.creditBalance.findUnique({
          where: { memberId: redemption.memberId },
        });

        if (creditBalance) {
          const newBalance = creditBalance.currentBalance + redemption.reward.costCredits;

          await tx.creditBalance.update({
            where: { memberId: redemption.memberId },
            data: {
              currentBalance: newBalance,
              lifetimeSpent: {
                decrement: redemption.reward.costCredits,
              },
            },
          });

          // Create refund transaction
          await tx.creditTransaction.create({
            data: {
              memberId: redemption.memberId,
              type: 'ADJUSTMENT',
              amount: redemption.reward.costCredits,
              balanceAfter: newBalance,
              reason: `Refund for rejected redemption: ${redemption.reward.name}`,
              adjustedById: session.user.id,
            },
          });
        }
      }

      // Restore quantity if applicable
      if (redemption.reward.quantity !== null) {
        await tx.rewardItem.update({
          where: { id: redemption.reward.id },
          data: {
            quantity: {
              increment: 1,
            },
            status: 'ACTIVE', // Restore to active if it was out of stock
          },
        });
      }

      return rejected;
    });

    // Notify child that their reward was rejected
    await prisma.notification.create({
      data: {
        userId: redemption.memberId,
        type: 'REWARD_REJECTED',
        title: 'Reward declined',
        message: `Your reward "${redemption.reward.name}" was not approved. ${redemption.reward.costCredits} credits have been refunded.${reason ? ` Reason: ${reason}` : ''}`,
        actionUrl: '/dashboard/rewards',
        metadata: {
          redemptionId: id,
          rewardName: redemption.reward.name,
          creditsRefunded: redemption.reward.costCredits,
          rejectionReason: reason || 'No reason provided',
          rejectedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      redemption: result,
      message: `Rejected ${redemption.member.name}'s redemption of "${redemption.reward.name}". Credits have been refunded.`,
    });
  } catch (error) {
    console.error('Reject redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to reject redemption' },
      { status: 500 }
    );
  }
}
