import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getTransportSchedule, updateTransportSchedule, deleteTransportSchedule } from '@/lib/data/transport';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const schedule = await getTransportSchedule(id);

    if (!schedule) {
      return NextResponse.json({ error: 'Transport schedule not found' }, { status: 404 });
    }

    if (schedule.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    logger.error('Error fetching transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport schedule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update transport schedules
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can update transport schedules' },
        { status: 403 }
      );
    }

    // Verify schedule exists
    const existing = await getTransportSchedule(id);
    if (!existing) {
      return NextResponse.json({ error: 'Transport schedule not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { dayOfWeek, time } = body;

    // Validation
    if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    if (time !== undefined && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format (24-hour)' },
        { status: 400 }
      );
    }

    const schedule = await updateTransportSchedule(id, body);
    
    // Audit log
    const supabase = await createClient();
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'TRANSPORT_SCHEDULE_UPDATED',
      entity_type: 'TRANSPORT_SCHEDULE',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        scheduleId: id,
      },
    });

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Transport schedule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update transport schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can delete transport schedules
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can delete transport schedules' },
        { status: 403 }
      );
    }

    // Verify schedule exists
    const existing = await getTransportSchedule(id);
    if (!existing) {
      return NextResponse.json({ error: 'Transport schedule not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteTransportSchedule(id);

    // Audit log
    const supabase = await createClient();
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'TRANSPORT_SCHEDULE_DELETED',
      entity_type: 'TRANSPORT_SCHEDULE',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        scheduleId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transport schedule deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete transport schedule' },
      { status: 500 }
    );
  }
}
