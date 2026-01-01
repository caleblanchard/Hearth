import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkAndAwardAchievement, updateStreak } from '@/lib/achievements';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can approve
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: choreInstanceId } = params;

    // Fetch the chore instance
    const choreInstance = await prisma.choreInstance.findUnique({
      where: { id: choreInstanceId },
      include: {
        choreSchedule: {
          include: {
            choreDefinition: true,
          },
        },
      },
    });

    if (!choreInstance) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (choreInstance.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Chore must be completed before approval' },
        { status: 400 }
      );
    }

    const creditValue = choreInstance.choreSchedule.choreDefinition.creditValue;

    // Update chore status
    const updatedChore = await prisma.choreInstance.update({
      where: { id: choreInstanceId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: session.user.id,
        creditsAwarded: creditValue,
      },
    });

    // Award credits
    if (creditValue > 0) {
      let creditBalance = await prisma.creditBalance.findUnique({
        where: { memberId: choreInstance.assignedToId },
      });

      if (!creditBalance) {
        creditBalance = await prisma.creditBalance.create({
          data: {
            memberId: choreInstance.assignedToId,
            currentBalance: creditValue,
            lifetimeEarned: creditValue,
            lifetimeSpent: 0,
          },
        });
      } else {
        creditBalance = await prisma.creditBalance.update({
          where: { memberId: choreInstance.assignedToId },
          data: {
            currentBalance: { increment: creditValue },
            lifetimeEarned: { increment: creditValue },
          },
        });
      }

      // Log credit transaction
      await prisma.creditTransaction.create({
        data: {
          memberId: choreInstance.assignedToId,
          type: 'CHORE_REWARD',
          amount: creditValue,
          balanceAfter: creditBalance.currentBalance,
          reason: `Approved: ${choreInstance.choreSchedule.choreDefinition.name}`,
          relatedChoreInstanceId: choreInstanceId,
          adjustedById: session.user.id,
        },
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'CHORE_APPROVED',
        entityType: 'ChoreInstance',
        entityId: choreInstanceId,
        result: 'SUCCESS',
        metadata: {
          choreName: choreInstance.choreSchedule.choreDefinition.name,
          creditsAwarded: creditValue,
          assignedTo: choreInstance.assignedToId,
        },
      },
    });

    // Notify child that their chore was approved
    await prisma.notification.create({
      data: {
        userId: choreInstance.assignedToId,
        type: 'CHORE_APPROVED',
        title: 'Chore approved!',
        message: `Your chore "${choreInstance.choreSchedule.choreDefinition.name}" was approved${creditValue > 0 ? ` and you earned ${creditValue} credits` : ''}!`,
        actionUrl: '/dashboard/chores',
        metadata: {
          choreInstanceId,
          choreName: choreInstance.choreSchedule.choreDefinition.name,
          creditsAwarded: creditValue,
          approvedBy: session.user.name,
        },
      },
    });

    // Check achievements and update streaks
    try {
      const choresCompleted = await prisma.choreInstance.count({
        where: {
          assignedToId: choreInstance.assignedToId,
          status: 'APPROVED',
        },
      });

      const creditBalance = await prisma.creditBalance.findUnique({
        where: { memberId: choreInstance.assignedToId },
      });

      // Check chore achievements
      await checkAndAwardAchievement(choreInstance.assignedToId, 'first_chore', choresCompleted);
      await checkAndAwardAchievement(choreInstance.assignedToId, 'chores_10', choresCompleted);
      await checkAndAwardAchievement(choreInstance.assignedToId, 'chores_50', choresCompleted);
      await checkAndAwardAchievement(choreInstance.assignedToId, 'chores_100', choresCompleted);
      await checkAndAwardAchievement(choreInstance.assignedToId, 'chores_500', choresCompleted);

      // Check credit achievements
      if (creditBalance) {
        await checkAndAwardAchievement(choreInstance.assignedToId, 'credits_100', creditBalance.lifetimeEarned);
        await checkAndAwardAchievement(choreInstance.assignedToId, 'credits_500', creditBalance.lifetimeEarned);
        await checkAndAwardAchievement(choreInstance.assignedToId, 'credits_1000', creditBalance.lifetimeEarned);
        await checkAndAwardAchievement(choreInstance.assignedToId, 'credits_5000', creditBalance.lifetimeEarned);
      }

      // Update daily streak
      await updateStreak(choreInstance.assignedToId, 'DAILY_CHORES');
    } catch (error) {
      console.error('Achievement check error:', error);
      // Don't fail the approval if achievement check fails
    }

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      message: 'Chore approved and credits awarded!',
    });
  } catch (error) {
    console.error('Chore approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve chore' },
      { status: 500 }
    );
  }
}
