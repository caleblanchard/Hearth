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

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const dayOfWeekParam = searchParams.get('dayOfWeek');
    
    const filters: { memberId?: string; dayOfWeek?: number } = {};
    if (memberId) filters.memberId = memberId;
    if (dayOfWeekParam) filters.dayOfWeek = parseInt(dayOfWeekParam);

    const schedules = await getTransportSchedules(familyId, filters);

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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create transport schedules
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create transport schedules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memberId: bodyMemberId, // Allow overriding memberId if parent
      dayOfWeek,
      time,
      type,
      locationId,
      driverId,
      carpoolId,
      notes,
    } = body;

    // Validate required fields
    if (dayOfWeek === undefined || !time || !type) {
      return NextResponse.json(
        { error: 'Day of week, time, and type are required' },
        { status: 400 }
      );
    }

    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format (simple regex)
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format (24-hour)' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['PICKUP', 'DROPOFF', 'BOTH'];
    if (!validTypes.includes(type)) {
       return NextResponse.json(
        { error: 'Invalid transport type' },
        { status: 400 }
      );
    }

    // Determine target member
    let targetMemberId = memberId;
    if (bodyMemberId && bodyMemberId !== memberId) {
        // Parent creating for child
        // Check if bodyMemberId belongs to family (handled by createTransportSchedule foreign key check ideally, but explicit check good)
        // For now assume caller is parent as verified above
        targetMemberId = bodyMemberId;
        
        // Check if member belongs to family
        const { data: member } = await supabase.from('family_members').select('id, family_id').eq('id', targetMemberId).single();
        if (!member || member.family_id !== familyId) {
             return NextResponse.json(
                { error: 'Member does not belong to your family' },
                { status: 400 }
              );
        }
    }

    const schedule = await createTransportSchedule({
      family_id: familyId,
      member_id: targetMemberId,
      day_of_week: dayOfWeek,
      time,
      type,
      location_id: locationId || null,
      driver_id: driverId || null,
      carpool_id: carpoolId || null,
      notes: notes || null,
      is_active: true,
    });

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId, // Who performed the action
      action: 'TRANSPORT_SCHEDULE_CREATED',
      entity_type: 'TRANSPORT_SCHEDULE',
      entity_id: schedule.id,
      result: 'SUCCESS',
      metadata: {
        scheduleId: schedule.id,
        member: targetMemberId,
        dayOfWeek,
        time,
        type
      },
    });

    // Map response to match API contract
    const mappedSchedule = {
      ...schedule,
      carpoolId: schedule.carpool_id,
      carpoolIdAlias: schedule.carpool_id, // Alias for backward compatibility if needed, but client likely expects camelCase of DB column
    };

    // If schedule comes from createTransportSchedule it might already be mapped depending on implementation
    // Let's check lib/data/transport.ts to see what it returns

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Transport schedule created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating transport schedule:', error);
    return NextResponse.json({ error: 'Failed to create transport schedule' }, { status: 500 });
  }
}
