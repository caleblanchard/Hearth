import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getTransportSchedules, createTransportSchedule } from '@/lib/data/transport';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const schedules = await getTransportSchedules(familyId);

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
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create transport schedules
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create transport schedules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      pickupLocation,
      dropoffLocation,
      daysOfWeek,
      departureTime,
      estimatedDuration,
    } = body;

    // Validate required fields
    if (!name || !pickupLocation || !dropoffLocation || !daysOfWeek || !departureTime) {
      return NextResponse.json(
        { error: 'Name, pickup location, dropoff location, days of week, and departure time are required' },
        { status: 400 }
      );
    }

    const schedule = await createTransportSchedule(familyId, {
      name,
      description: description || null,
      pickupLocation,
      dropoffLocation,
      daysOfWeek,
      departureTime,
      estimatedDuration: estimatedDuration || null,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'TRANSPORT_SCHEDULE_CREATED',
      entity_type: 'TRANSPORT_SCHEDULE',
      entity_id: schedule.id,
      result: 'SUCCESS',
      metadata: { name, pickupLocation, dropoffLocation },
    });

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Transport schedule created successfully',
    });
  } catch (error) {
    logger.error('Error creating transport schedule:', error);
    return NextResponse.json({ error: 'Failed to create transport schedule' }, { status: 500 });
  }
}
