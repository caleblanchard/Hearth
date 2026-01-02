import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const VALID_TYPES = ['PICKUP', 'DROPOFF'];

// Validate time format (HH:MM in 24-hour format)
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await prisma.transportSchedule.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            relationship: true,
          },
        },
        carpool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Transport schedule not found' },
        { status: 404 }
      );
    }

    // Verify schedule belongs to user's family
    if (schedule.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport schedule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update transport schedules' },
        { status: 403 }
      );
    }

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.transportSchedule.findUnique({
      where: { id: params.id },
      select: { id: true, familyId: true },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Transport schedule not found' },
        { status: 404 }
      );
    }

    if (existingSchedule.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { dayOfWeek, time, type, locationId, driverId, carpoolId, notes } = body;

    // Validate dayOfWeek if provided
    if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format if provided
    if (time !== undefined && !isValidTime(time)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format (24-hour)' },
        { status: 400 }
      );
    }

    // Validate type if provided
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (time !== undefined) updateData.time = time;
    if (type !== undefined) updateData.type = type;
    if (locationId !== undefined) updateData.locationId = locationId || null;
    if (driverId !== undefined) updateData.driverId = driverId || null;
    if (carpoolId !== undefined) updateData.carpoolId = carpoolId || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Update schedule
    const schedule = await prisma.transportSchedule.update({
      where: { id: params.id },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            relationship: true,
          },
        },
        carpool: {
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
        action: 'TRANSPORT_SCHEDULE_UPDATED',
        result: 'SUCCESS',
        metadata: {
          scheduleId: params.id,
        },
      },
    });

    return NextResponse.json({
      schedule,
      message: 'Transport schedule updated successfully',
    });
  } catch (error) {
    console.error('Error updating transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update transport schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can delete schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete transport schedules' },
        { status: 403 }
      );
    }

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.transportSchedule.findUnique({
      where: { id: params.id },
      select: { id: true, familyId: true },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Transport schedule not found' },
        { status: 404 }
      );
    }

    if (existingSchedule.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    await prisma.transportSchedule.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'TRANSPORT_SCHEDULE_DELETED',
        result: 'SUCCESS',
        metadata: {
          scheduleId: params.id,
        },
      },
    });

    return NextResponse.json({
      message: 'Transport schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete transport schedule' },
      { status: 500 }
    );
  }
}
