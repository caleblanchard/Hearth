import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_TYPES = ['PICKUP', 'DROPOFF'];

// Validate time format (HH:MM in 24-hour format)
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const dayOfWeekParam = searchParams.get('dayOfWeek');

    // Build where clause
    const where: any = {
      familyId: session.user.familyId,
      isActive: true,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (dayOfWeekParam !== null) {
      where.dayOfWeek = parseInt(dayOfWeekParam, 10);
    }

    const schedules = await prisma.transportSchedule.findMany({
      where,
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
      orderBy: [
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    logger.error('Error fetching transport schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create transport schedules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, dayOfWeek, time, type, locationId, driverId, carpoolId, notes } = body;

    // Validate required fields
    if (!memberId || dayOfWeek === undefined || !time || !type) {
      return NextResponse.json(
        { error: 'Member ID, day of week, time, and type are required' },
        { status: 400 }
      );
    }

    // Validate dayOfWeek (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format
    if (!isValidTime(time)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format (24-hour)' },
        { status: 400 }
      );
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Member does not belong to your family' },
        { status: 400 }
      );
    }

    // Create schedule
    const schedule = await prisma.transportSchedule.create({
      data: {
        familyId: session.user.familyId,
        memberId,
        dayOfWeek,
        time,
        type,
        locationId: locationId || null,
        driverId: driverId || null,
        carpoolId: carpoolId || null,
        notes: notes?.trim() || null,
      },
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
        action: 'TRANSPORT_SCHEDULE_CREATED',
        result: 'SUCCESS',
        metadata: {
          scheduleId: schedule.id,
          member: memberId,
          dayOfWeek,
          time,
          type,
        },
      },
    });

    return NextResponse.json(
      { schedule, message: 'Transport schedule created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create transport schedule' },
      { status: 500 }
    );
  }
}
