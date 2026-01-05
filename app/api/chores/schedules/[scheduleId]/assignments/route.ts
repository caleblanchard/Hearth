import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.choreSchedule.findUnique({
      where: { id: params.scheduleId },
      include: {
        choreDefinition: true,
        assignments: {
          where: { isActive: true },
        },
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existingSchedule.choreDefinition.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, rotationOrder } = body;

    // Validation
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Verify member exists and belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Invalid member' }, { status: 400 });
    }

    // Check if member is already assigned
    const existingAssignment = existingSchedule.assignments.find(a => a.memberId === memberId);
    if (existingAssignment) {
      return NextResponse.json({ error: 'Member is already assigned to this schedule' }, { status: 400 });
    }

    // If ROTATING, validate rotationOrder
    let finalRotationOrder = rotationOrder;
    if (existingSchedule.assignmentType === 'ROTATING') {
      if (rotationOrder == null) {
        // Auto-assign next rotation order
        const maxRotation = existingSchedule.assignments.reduce((max, a) => Math.max(max, a.rotationOrder || 0), -1);
        finalRotationOrder = maxRotation + 1;
      }
    }

    // Create assignment
    const newAssignment = await prisma.choreAssignment.create({
      data: {
        choreScheduleId: params.scheduleId,
        memberId,
        rotationOrder: finalRotationOrder,
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message: 'Assignment created successfully',
    });
  } catch (error) {
    logger.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
