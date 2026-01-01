import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
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
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existingSchedule.choreDefinition.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      frequency,
      dayOfWeek,
      customCron,
      requiresApproval,
      requiresPhoto,
    } = body;

    // Validation
    const updates: any = {};

    if (frequency !== undefined) {
      if (!['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'].includes(frequency)) {
        return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      updates.frequency = frequency;

      // Validate dayOfWeek if changing to WEEKLY/BIWEEKLY
      if ((frequency === 'WEEKLY' || frequency === 'BIWEEKLY') && dayOfWeek == null) {
        return NextResponse.json({ error: 'Day of week is required for weekly/biweekly schedules' }, { status: 400 });
      }

      // Validate customCron if changing to CUSTOM
      if (frequency === 'CUSTOM' && !customCron) {
        return NextResponse.json({ error: 'Custom cron expression is required for custom frequency' }, { status: 400 });
      }
    }

    if (dayOfWeek !== undefined) {
      updates.dayOfWeek = dayOfWeek;
    }

    if (customCron !== undefined) {
      updates.customCron = customCron || null;
    }

    if (requiresApproval !== undefined) {
      updates.requiresApproval = requiresApproval;
    }

    if (requiresPhoto !== undefined) {
      updates.requiresPhoto = requiresPhoto;
    }

    // Update schedule
    const updatedSchedule = await prisma.choreSchedule.update({
      where: { id: params.scheduleId },
      data: updates,
      include: {
        assignments: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        },
        choreDefinition: true,
      },
    });

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
