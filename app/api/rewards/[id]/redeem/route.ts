import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCurrentPeriodKey, checkBudgetStatus } from '@/lib/budget-tracker';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rewardId } = params;
    
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
    const { notes } = body;

    // Get reward details
    const reward = await prisma.rewardItem.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (reward.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (reward.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This reward is not currently available' },
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const creditBalance = await prisma.creditBalance.findUnique({
      where: { memberId: session.user.id },
    });

    if (!creditBalance) {
      return NextResponse.json(
        { error: 'Credit balance not found' },
        { status: 400 }
      );
    }

    if (creditBalance.currentBalance < reward.costCredits) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${reward.costCredits} credits but only have ${creditBalance.currentBalance}.` },
        { status: 400 }
      );
    }

    // Check quantity availability
    if (reward.quantity !== null && reward.quantity <= 0) {
      return NextResponse.json(
        { error: 'This reward is out of stock' },
        { status: 400 }
      );
    }

    // Check budget (advisory, not blocking)
    let budgetWarning = null;
    try {
      const activeBudgets = await prisma.budget.findMany({
        where: {
          memberId: session.user.id,
          category: 'REWARDS',
          isActive: true,
        },
        include: {
          periods: {
            orderBy: {
              periodStart: 'desc',
            },
            take: 1,
          },
        },
      });

      for (const budget of activeBudgets) {
        const periodKey = getCurrentPeriodKey(budget.period);
        const currentPeriod = budget.periods.find((p) => p.periodKey === periodKey);

        const status = checkBudgetStatus(budget, currentPeriod || null, reward.costCredits);

        if (status.status === 'warning' || status.status === 'exceeded') {
          budgetWarning = {
            message: status.status === 'exceeded'
              ? `This purchase will exceed your ${budget.period} REWARDS budget`
              : `This purchase will use ${status.percentageUsed}% of your ${budget.period} REWARDS budget`,
            budgetLimit: status.budgetLimit,
            currentSpent: status.currentSpent,
            projectedSpent: status.projectedSpent,
            percentageUsed: status.percentageUsed,
          };
          break; // Only show first warning
        }
      }
    } catch (error) {
      console.error('Budget check error:', error);
      // Don't block redemption if budget check fails
    }

    // Create redemption request and deduct credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct credits
      const newBalance = creditBalance.currentBalance - reward.costCredits;

      const updatedBalance = await tx.creditBalance.update({
        where: { memberId: session.user.id },
        data: {
          currentBalance: newBalance,
          lifetimeSpent: {
            increment: reward.costCredits,
          },
        },
      });

      // Create credit transaction
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          memberId: session.user.id,
          type: 'REWARD_REDEMPTION',
          amount: -reward.costCredits,
          balanceAfter: newBalance,
          reason: `Redeemed: ${reward.name}`,
          category: 'REWARDS',
        },
      });

      // Create redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          rewardId: reward.id,
          memberId: session.user.id,
          creditTransactionId: creditTransaction.id,
          status: 'PENDING',
          notes: notes || null,
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

      // Decrease quantity if applicable
      if (reward.quantity !== null) {
        await tx.rewardItem.update({
          where: { id: reward.id },
          data: {
            quantity: {
              decrement: 1,
            },
            status: reward.quantity - 1 <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
          },
        });
      }

      return { redemption, updatedBalance };
    });

    // Notify parents about the reward redemption request
    const parents = await prisma.familyMember.findMany({
      where: {
        familyId: session.user.familyId,
        role: 'PARENT',
        isActive: true,
      },
    });

    await Promise.all(
      parents.map((parent) =>
        prisma.notification.create({
          data: {
            userId: parent.id,
            type: 'REWARD_REQUESTED',
            title: 'Reward requested',
            message: `${session.user.name} wants to redeem: ${reward.name} (${reward.costCredits} credits)`,
            actionUrl: '/dashboard/approvals',
            metadata: {
              redemptionId: result.redemption.id,
              rewardName: reward.name,
              costCredits: reward.costCredits,
              requestedBy: session.user.name,
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      newBalance: result.updatedBalance.currentBalance,
      message: `Successfully redeemed "${reward.name}"! ${reward.costCredits} credits deducted. New balance: ${result.updatedBalance.currentBalance} credits.`,
      budgetWarning: budgetWarning || undefined,
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}
