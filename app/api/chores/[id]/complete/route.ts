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

    const { id: choreInstanceId } = params;
    
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

    // Verify the user is assigned to this chore or is a parent
    if (
      choreInstance.assignedToId !== session.user.id &&
      session.user.role !== 'PARENT'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update chore status
    const updatedChore = await prisma.choreInstance.update({
      where: { id: choreInstanceId },
      data: {
        status: choreInstance.choreSchedule.requiresApproval
          ? 'COMPLETED'
          : 'APPROVED',
        completedAt: new Date(),
        completedById: session.user.id,
        notes: notes || null,
        // If no approval required, award credits immediately
        creditsAwarded: choreInstance.choreSchedule.requiresApproval
          ? null
          : choreInstance.choreSchedule.choreDefinition.creditValue,
      },
    });

    // If no approval required, award credits immediately
    if (!choreInstance.choreSchedule.requiresApproval) {
      const creditValue = choreInstance.choreSchedule.choreDefinition.creditValue;

      if (creditValue > 0) {
        // Use transaction to prevent race conditions
        await prisma.$transaction(async (tx) => {
          // Upsert credit balance atomically
          const creditBalance = await tx.creditBalance.upsert({
            where: { memberId: choreInstance.assignedToId },
            update: {
              currentBalance: { increment: creditValue },
              lifetimeEarned: { increment: creditValue },
            },
            create: {
              memberId: choreInstance.assignedToId,
              currentBalance: creditValue,
              lifetimeEarned: creditValue,
              lifetimeSpent: 0,
            },
          });

          // Log credit transaction
          await tx.creditTransaction.create({
            data: {
              memberId: choreInstance.assignedToId,
              type: 'CHORE_REWARD',
              amount: creditValue,
              balanceAfter: creditBalance.currentBalance,
              reason: `Completed: ${choreInstance.choreSchedule.choreDefinition.name}`,
              relatedChoreInstanceId: choreInstanceId,
            },
          });
        });
      }
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'CHORE_COMPLETED',
        entityType: 'ChoreInstance',
        entityId: choreInstanceId,
        result: 'SUCCESS',
        metadata: {
          choreName: choreInstance.choreSchedule.choreDefinition.name,
          requiresApproval: choreInstance.choreSchedule.requiresApproval,
        },
      },
    });

    // Create notifications
    if (choreInstance.choreSchedule.requiresApproval) {
      // Notify parents that chore is waiting for approval
      const parents = await prisma.familyMember.findMany({
        where: {
          familyId: session.user.familyId,
          role: 'PARENT',
          isActive: true,
        },
      });

      // Use createMany to avoid N+1 query problem
      // Notifications are non-critical, so failures don't block the chore completion
      if (parents.length > 0) {
        try {
          await prisma.notification.createMany({
            data: parents.map((parent) => ({
              userId: parent.id,
              type: 'CHORE_COMPLETED',
              title: 'Chore completed',
              message: `${session.user.name} completed: ${choreInstance.choreSchedule.choreDefinition.name}`,
              actionUrl: '/dashboard/approvals',
              metadata: {
                choreInstanceId,
                choreName: choreInstance.choreSchedule.choreDefinition.name,
                completedBy: session.user.name,
              } as any,
            })),
          });
        } catch (notificationError) {
          // Log error but don't fail the chore completion
          logger.error('Failed to create notifications for chore completion', notificationError, {
            choreInstanceId,
            parentCount: parents.length,
          });
        }
      }
    } else if (choreInstance.choreSchedule.choreDefinition.creditValue > 0) {
      // Notify child that they earned credits
      await prisma.notification.create({
        data: {
          userId: choreInstance.assignedToId,
          type: 'CREDITS_EARNED',
          title: 'Credits earned!',
          message: `You earned ${choreInstance.choreSchedule.choreDefinition.creditValue} credits for completing: ${choreInstance.choreSchedule.choreDefinition.name}`,
          actionUrl: '/dashboard',
          metadata: {
            choreInstanceId,
            choreName: choreInstance.choreSchedule.choreDefinition.name,
            creditsEarned: choreInstance.choreSchedule.choreDefinition.creditValue,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      message: choreInstance.choreSchedule.requiresApproval
        ? 'Chore marked complete! Waiting for parent approval.'
        : 'Chore completed and credits awarded!',
    });
  } catch (error) {
    logger.error('Chore completion error', error, { choreInstanceId: params.id });
    return NextResponse.json(
      { error: 'Failed to complete chore' },
      { status: 500 }
    );
  }
}
