import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getChoreDefinitions } from '@/lib/data/chores';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if parent
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Use data module
    const chores = await getChoreDefinitions(familyId);

    return NextResponse.json({ data: chores, total: chores.length });
  } catch (error) {
    logger.error('Error fetching chores', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    // Check if parent
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name: rawName,
      description: rawDescription,
      creditValue: rawCreditValue,
      difficulty: rawDifficulty,
      estimatedMinutes: rawEstimatedMinutes,
      minimumAge: rawMinimumAge,
      iconName: rawIconName,
      schedule,
    } = body;

    // Sanitize and validate input
    const name = sanitizeString(rawName);
    if (!name || name.length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const description = rawDescription ? sanitizeString(rawDescription) : null;
    const iconName = rawIconName ? sanitizeString(rawIconName) : null;

    const creditValue = rawCreditValue != null ? parseInt(String(rawCreditValue), 10) : 0;
    if (isNaN(creditValue) || creditValue < 0) {
      return NextResponse.json({ error: 'Credit value must be 0 or greater' }, { status: 400 });
    }

    const estimatedMinutes = rawEstimatedMinutes ? parseInt(String(rawEstimatedMinutes), 10) : null;
    if (!estimatedMinutes || estimatedMinutes <= 0) {
      return NextResponse.json({ error: 'Estimated minutes must be greater than 0' }, { status: 400 });
    }

    const minimumAge = rawMinimumAge ? parseInt(String(rawMinimumAge), 10) : null;
    if (minimumAge !== null && (isNaN(minimumAge) || minimumAge < 0)) {
      return NextResponse.json({ error: 'Minimum age must be 0 or greater' }, { status: 400 });
    }

    const difficulty = sanitizeString(rawDifficulty);
    if (!difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return NextResponse.json({ error: 'Difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
    }

    // Schedule validation
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule is required' }, { status: 400 });
    }

    if (!['FIXED', 'ROTATING', 'OPT_IN'].includes(schedule.assignmentType)) {
      return NextResponse.json({ error: 'Invalid assignment type' }, { status: 400 });
    }

    if (!['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'].includes(schedule.frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    if ((schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY') && schedule.dayOfWeek == null) {
      return NextResponse.json({ error: 'Day of week is required for weekly/biweekly schedules' }, { status: 400 });
    }

    if (schedule.frequency === 'CUSTOM' && !schedule.customCron) {
      return NextResponse.json({ error: 'Custom cron expression is required for custom frequency' }, { status: 400 });
    }

    // Assignments validation
    if (!schedule.assignments || schedule.assignments.length === 0) {
      return NextResponse.json({ error: 'At least one assignment is required' }, { status: 400 });
    }

    if (schedule.assignmentType === 'ROTATING' && schedule.assignments.length < 2) {
      return NextResponse.json({ error: 'Rotating assignments require at least 2 members' }, { status: 400 });
    }

    // Validate rotation order if ROTATING
    if (schedule.assignmentType === 'ROTATING') {
      const rotationOrders = schedule.assignments.map((a: any) => a.rotationOrder).sort((a: number, b: number) => a - b);
      for (let i = 0; i < rotationOrders.length; i++) {
        if (rotationOrders[i] !== i) {
          return NextResponse.json({ error: 'Rotation order must be sequential starting from 0' }, { status: 400 });
        }
      }
    }

    // Use RPC function for atomic creation (if available) or manual transaction
    // For now, create manually with proper error handling
    
    // 1. Create chore definition
    const { data: definition, error: defError } = await supabase
      .from('chore_definitions')
      .insert({
        family_id: familyId,
        name,
        description,
        credit_value: creditValue,
        difficulty,
        estimated_minutes: estimatedMinutes,
        minimum_age: minimumAge,
        icon_name: iconName,
        is_active: true,
      })
      .select()
      .single();

    if (defError) {
      logger.error('Error creating chore definition:', defError);
      return NextResponse.json({ error: 'Failed to create chore definition' }, { status: 500 });
    }

    // 2. Create schedule
    const { data: choreSchedule, error: schedError } = await supabase
      .from('chore_schedules')
      .insert({
        chore_definition_id: definition.id,
        assignment_type: schedule.assignmentType,
        frequency: schedule.frequency,
        day_of_week: schedule.dayOfWeek ?? null,
        custom_cron: schedule.customCron || null,
        requires_approval: schedule.requiresApproval ?? false,
        requires_photo: schedule.requiresPhoto ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (schedError) {
      // Rollback: delete definition
      await supabase.from('chore_definitions').delete().eq('id', definition.id);
      logger.error('Error creating chore schedule:', schedError);
      return NextResponse.json({ error: 'Failed to create chore schedule' }, { status: 500 });
    }

    // 3. Create assignments
    const assignments = schedule.assignments.map((assignment: any) => ({
      chore_schedule_id: choreSchedule.id,
      member_id: assignment.memberId,
      rotation_order: assignment.rotationOrder ?? null,
      is_active: true,
    }));

    const { error: assignError } = await supabase
      .from('chore_assignments')
      .insert(assignments);

    if (assignError) {
      // Rollback: delete schedule and definition
      await supabase.from('chore_schedules').delete().eq('id', choreSchedule.id);
      await supabase.from('chore_definitions').delete().eq('id', definition.id);
      logger.error('Error creating chore assignments:', assignError);
      return NextResponse.json({ error: 'Failed to create chore assignments' }, { status: 500 });
    }

    // Fetch complete chore with relationships
    const { data: completeChore } = await supabase
      .from('chore_definitions')
      .select(`
        *,
        schedules:chore_schedules(
          *,
          assignments:chore_assignments(
            *,
            member:family_members(id, name, avatar_url)
          )
        )
      `)
      .eq('id', definition.id)
      .single();

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'CHORE_CREATED',
      entity_type: 'CHORE',
      entity_id: definition.id,
      result: 'SUCCESS',
      metadata: { name },
    });

    return NextResponse.json({
      success: true,
      chore: completeChore,
      message: 'Chore created successfully',
    });
  } catch (error) {
    logger.error('Error creating chore', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
