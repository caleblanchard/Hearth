import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onCalendarEventAdded } from '@/lib/rules-engine/hooks';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query filter
    const where: any = {
      familyId: session.user.familyId,
    };

    // Filter by date range if provided
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
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
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify family exists
    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      isAllDay,
      color,
      assignedMemberIds,
    } = body;

    // Validation
    if (!title || !startTime) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      );
    }

    // Create event with assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.calendarEvent.create({
        data: {
          familyId: family.id,
          title,
          description: description || null,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : new Date(startTime),
          location: location || null,
          eventType: 'INTERNAL',
          color: color || '#3b82f6',
          isAllDay: isAllDay || false,
          createdById: session.user.id,
        },
      });

      // Create assignments if provided
      if (assignedMemberIds && assignedMemberIds.length > 0) {
        await tx.calendarEventAssignment.createMany({
          data: assignedMemberIds.map((memberId: string) => ({
            eventId: event.id,
            memberId,
          })),
        });
      }

      return event;
    });

    // Count events for the same day to check if calendar is busy
    const eventDate = new Date(result.startTime);
    const dayStart = new Date(eventDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(eventDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayEventCount = await prisma.calendarEvent.count({
      where: {
        familyId: session.user.familyId,
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Trigger rules engine evaluation (async, fire-and-forget)
    try {
      await onCalendarEventAdded(
        {
          id: result.id,
          title: result.title,
          startTime: result.startTime,
          endTime: result.endTime,
        },
        session.user.familyId,
        dayEventCount
      );
    } catch (error) {
      console.error('Rules engine hook error:', error);
      // Don't fail the event creation if rules engine fails
    }

    return NextResponse.json({
      message: 'Event created successfully',
      event: result,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
