import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RoutineType } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

const VALID_ROUTINE_TYPES = ['MORNING', 'BEDTIME', 'HOMEWORK', 'AFTER_SCHOOL', 'CUSTOM'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const routine = await prisma.routine.findUnique({
      where: {
        id: params.id,
      },
      include: {
        steps: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this routine' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      routine,
    });
  } catch (error) {
    logger.error('Error fetching routine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routine' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update routines
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update routines' },
        { status: 403 }
      );
    }

    const routine = await prisma.routine.findUnique({
      where: { id: params.id },
    });

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this routine' },
        { status: 403 }
      );
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
    const { name, type, assignedTo, isWeekday, isWeekend, steps } = body;

    // Validate type if provided
    if (type && !VALID_ROUTINE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid routine type' },
        { status: 400 }
      );
    }

    // Validate assignedTo if provided
    if (assignedTo !== undefined && assignedTo !== null) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: assignedTo,
          familyId: session.user.familyId,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Assigned member must be a valid family member' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type as RoutineType;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (isWeekday !== undefined) updateData.isWeekday = isWeekday;
    if (isWeekend !== undefined) updateData.isWeekend = isWeekend;

    // Handle steps update - delete old steps and create new ones
    if (steps !== undefined) {
      // Delete existing steps
      await prisma.routineStep.deleteMany({
        where: {
          routineId: params.id,
        },
      });

      // Create new steps
      updateData.steps = {
        create: steps.map((step: any, index: number) => ({
          name: step.name,
          icon: step.icon || null,
          estimatedMinutes: step.estimatedMinutes || null,
          sortOrder: index,
        })),
      };
    }

    // Update routine
    const updatedRoutine = await prisma.routine.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        steps: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'ROUTINE_UPDATED',
        result: 'SUCCESS',
        metadata: {
          routineId: updatedRoutine.id,
          routineName: updatedRoutine.name,
          changes: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      routine: updatedRoutine,
      message: 'Routine updated successfully',
    });
  } catch (error) {
    logger.error('Error updating routine:', error);
    return NextResponse.json(
      { error: 'Failed to update routine' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can delete routines
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete routines' },
        { status: 403 }
      );
    }

    const routine = await prisma.routine.findUnique({
      where: { id: params.id },
    });

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this routine' },
        { status: 403 }
      );
    }

    // Delete routine (cascade will delete steps and completions)
    await prisma.routine.delete({
      where: {
        id: params.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'ROUTINE_DELETED',
        result: 'SUCCESS',
        metadata: {
          routineId: routine.id,
          routineName: routine.name,
          routineType: routine.type,
        },
      },
    });

    return NextResponse.json({
      message: 'Routine deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting routine:', error);
    return NextResponse.json(
      { error: 'Failed to delete routine' },
      { status: 500 }
    );
  }
}
