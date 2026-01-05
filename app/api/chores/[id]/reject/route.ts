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

    // Only parents can reject
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: choreInstanceId } = params;
    const { reason } = await request.json();

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
        { error: 'Chore must be completed before rejection' },
        { status: 400 }
      );
    }

    // Update chore status back to pending
    const updatedChore = await prisma.choreInstance.update({
      where: { id: choreInstanceId },
      data: {
        status: 'REJECTED',
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: reason || choreInstance.notes,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'CHORE_REJECTED',
        entityType: 'ChoreInstance',
        entityId: choreInstanceId,
        result: 'SUCCESS',
        metadata: {
          choreName: choreInstance.choreSchedule.choreDefinition.name,
          reason: reason || 'No reason provided',
          assignedTo: choreInstance.assignedToId,
        },
      },
    });

    // Notify child that their chore was rejected
    await prisma.notification.create({
      data: {
        userId: choreInstance.assignedToId,
        type: 'CHORE_REJECTED',
        title: 'Chore needs work',
        message: `Your chore "${choreInstance.choreSchedule.choreDefinition.name}" needs to be redone.${reason ? ` Reason: ${reason}` : ''}`,
        actionUrl: '/dashboard/chores',
        metadata: {
          choreInstanceId,
          choreName: choreInstance.choreSchedule.choreDefinition.name,
          rejectionReason: reason || 'No reason provided',
          rejectedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      message: 'Chore rejected. Please try again!',
    });
  } catch (error) {
    logger.error('Chore rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject chore' },
      { status: 500 }
    );
  }
}
