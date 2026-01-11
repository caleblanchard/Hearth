import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { updateChoreSchedule } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params
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

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify schedule exists and belongs to family
    const { data: existingSchedule } = await supabase
      .from('chore_schedules')
      .select('*, chore_definition:chore_definitions!inner(family_id)')
      .eq('id', scheduleId)
      .single();

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existingSchedule.chore_definition.family_id !== familyId) {
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
      updates.day_of_week = dayOfWeek;
    }

    if (customCron !== undefined) {
      updates.custom_cron = customCron || null;
    }

    if (requiresApproval !== undefined) {
      updates.requires_approval = requiresApproval;
    }

    if (requiresPhoto !== undefined) {
      updates.requires_photo = requiresPhoto;
    }

    // Update schedule
    const updatedSchedule = await updateChoreSchedule(scheduleId, updates);

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
