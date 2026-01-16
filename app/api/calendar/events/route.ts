import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarEvents, createCalendarEvent } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 });
    }

    // Use data module
    const events = await getCalendarEvents(familyId, startDate, endDate);

    // Map to camelCase for frontend
    const mappedEvents = events.map(event => ({
      id: event.id,
      familyId: event.family_id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      isAllDay: event.is_all_day,
      location: event.location,
      eventType: event.event_type,
      color: event.color,
      externalId: event.external_id,
      externalSubscriptionId: event.external_subscription_id,
      createdById: event.created_by_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      createdBy: event.creator || { id: event.created_by_id || '', name: 'System' },
      assignments: event.assignments || [],
    }));

    return NextResponse.json({ events: mappedEvents });
  } catch (error) {
    logger.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();

    const {
      title,
      description,
      startTime,
      endTime,
      isAllDay,
      location,
      eventType,
      color,
    } = body;

    // Validation
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Title, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Use data module
    const event = await createCalendarEvent({
      family_id: familyId,
      created_by_id: memberId,
      title: title.trim(),
      description: description?.trim() || null,
      start_time: startTime,
      end_time: endTime,
      is_all_day: isAllDay || false,
      location: location?.trim() || null,
      event_type: eventType || 'GENERAL',
      color: color || null,
    });

    // Create audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'CALENDAR_EVENT_CREATED',
      entity_type: 'CALENDAR',
      entity_id: event.id,
      result: 'SUCCESS',
      metadata: {
        title: event.title,
        startTime: event.start_time,
      },
    });

    return NextResponse.json(
      { event, message: 'Event created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
