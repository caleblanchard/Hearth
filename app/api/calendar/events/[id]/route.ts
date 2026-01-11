import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = params;
    const body = await request.json();

    // Verify the event belongs to the user's family
    const { data: event } = await supabase
      .from('calendar_events')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!event || event.family_id !== familyId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event
    const updatedEvent = await updateCalendarEvent(id, body);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully',
    });
  } catch (error) {
    logger.error('Update calendar event error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = params;

    // Verify the event belongs to the user's family
    const { data: event } = await supabase
      .from('calendar_events')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!event || event.family_id !== familyId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete event
    await deleteCalendarEvent(id);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    logger.error('Delete calendar event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
