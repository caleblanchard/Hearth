import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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

    // Verify the event belongs to the user's family
    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event || event.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event and assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.calendarEvent.update({
        where: { id },
        data: {
          title: title !== undefined ? title : event.title,
          description: description !== undefined ? description : event.description,
          startTime: startTime ? new Date(startTime) : event.startTime,
          endTime: endTime ? new Date(endTime) : event.endTime,
          location: location !== undefined ? location : event.location,
          isAllDay: isAllDay !== undefined ? isAllDay : event.isAllDay,
          color: color !== undefined ? color : event.color,
        },
      });

      // Update assignments if provided
      if (assignedMemberIds !== undefined) {
        // Delete existing assignments
        await tx.calendarEventAssignment.deleteMany({
          where: { eventId: id },
        });

        // Create new assignments
        if (assignedMemberIds.length > 0) {
          await tx.calendarEventAssignment.createMany({
            data: assignedMemberIds.map((memberId: string) => ({
              eventId: id,
              memberId,
            })),
          });
        }
      }

      return updatedEvent;
    });

    return NextResponse.json({
      message: 'Event updated successfully',
      event: result,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify the event belongs to the user's family
    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event || event.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete event (assignments will cascade)
    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
