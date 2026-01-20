import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getChoreDefinitions } from '@/lib/data/chores';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { getNextDueDates, getNextAssignee, startOfDay, endOfDay } from '@/lib/chore-scheduler';
import { isMemberInSickMode } from '@/lib/sick-mode';

export async function GET(request: NextRequest) {
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

    // Check if parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Fetch chores with schedules and assignments (separate queries to avoid potential RLS stack depth issues)
    const supabase = await createClient();
    
    // 1. Get chore definitions
    const { data: chores, error: choresError } = await supabase
      .from('chore_definitions')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('name');

    if (choresError) {
      logger.error('Error fetching chores:', choresError);
      return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
    }

    if (!chores || chores.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2. Get all schedules for these chores
    const choreIds = chores.map(c => c.id);
    const { data: schedules } = await supabase
      .from('chore_schedules')
      .select('*')
      .in('chore_definition_id', choreIds);

    // 3. Get all assignments for these schedules
    const scheduleIds = schedules?.map(s => s.id) || [];
    const { data: assignments } = scheduleIds.length > 0 ? await supabase
      .from('chore_assignments')
      .select(`
        *,
        member:family_members(id, name, avatar_url)
      `)
      .in('chore_schedule_id', scheduleIds) : { data: [] };

    // 4. Get instance counts for schedules
    const { data: instanceCounts } = scheduleIds.length > 0 ? await supabase
      .from('chore_instances')
      .select('chore_schedule_id')
      .in('chore_schedule_id', scheduleIds) : { data: [] };

    // Count instances per schedule
    const countsBySchedule = (instanceCounts || []).reduce((acc, instance) => {
      acc[instance.chore_schedule_id] = (acc[instance.chore_schedule_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 5. Reconstruct nested structure with camelCase mapping
    const choresWithRelations = chores.map(chore => ({
      id: chore.id,
      name: chore.name,
      description: chore.description,
      creditValue: chore.credit_value,
      difficulty: chore.difficulty,
      estimatedMinutes: chore.estimated_minutes,
      minimumAge: chore.minimum_age,
      iconName: chore.icon_name,
      isActive: chore.is_active,
      createdAt: chore.created_at,
      updatedAt: chore.updated_at,
      schedules: (schedules || [])
        .filter(s => s.chore_definition_id === chore.id)
        .map(schedule => ({
          id: schedule.id,
          choreDefinitionId: schedule.chore_definition_id,
          assignmentType: schedule.assignment_type,
          frequency: schedule.frequency,
          dayOfWeek: schedule.day_of_week,
          customCron: schedule.custom_cron,
          requiresApproval: schedule.requires_approval,
          requiresPhoto: schedule.requires_photo,
          isActive: schedule.is_active,
          createdAt: schedule.created_at,
          updatedAt: schedule.updated_at,
          assignments: (assignments || [])
            .filter(a => a.chore_schedule_id === schedule.id)
            .map(assignment => ({
              id: assignment.id,
              choreScheduleId: assignment.chore_schedule_id,
              memberId: assignment.member_id,
              rotationOrder: assignment.rotation_order,
              isActive: assignment.is_active,
              member: assignment.member
            })),
          _count: {
            instances: countsBySchedule[schedule.id] || 0
          }
        }))
    }));

    return NextResponse.json({ data: choresWithRelations, total: choresWithRelations.length });
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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if parent
    const isParent = await isParentInFamily( familyId);
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
    const choreData: any = {
      family_id: familyId,
      name,
      description,
      credit_value: creditValue,
      difficulty,
      estimated_minutes: estimatedMinutes,
      minimum_age: minimumAge,
      is_active: true,
    };
    
    // Only include icon_name if provided, otherwise let default apply
    if (iconName) {
      choreData.icon_name = iconName;
    }
    
    const { data: definition, error: defError } = await (supabase as any)
      .from('chore_definitions')
      .insert(choreData)
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

    // Fetch complete chore with relationships (separate queries to avoid RLS stack depth issues)
    const { data: completeChore } = await supabase
      .from('chore_definitions')
      .select('*')
      .eq('id', definition.id)
      .single();

    const { data: schedules } = await supabase
      .from('chore_schedules')
      .select('*')
      .eq('chore_definition_id', definition.id);

    const { data: assignmentsWithMembers } = await supabase
      .from('chore_assignments')
      .select(`
        *,
        member:family_members(id, name, avatar_url)
      `)
      .eq('chore_schedule_id', choreSchedule.id);

    // Reconstruct nested structure with camelCase mapping
    const completeChoreWithRelations = completeChore ? {
      id: completeChore.id,
      name: completeChore.name,
      description: completeChore.description,
      creditValue: completeChore.credit_value,
      difficulty: completeChore.difficulty,
      estimatedMinutes: completeChore.estimated_minutes,
      minimumAge: completeChore.minimum_age,
      iconName: completeChore.icon_name,
      isActive: completeChore.is_active,
      createdAt: completeChore.created_at,
      updatedAt: completeChore.updated_at,
      schedules: schedules?.map(sched => ({
        id: sched.id,
        choreDefinitionId: sched.chore_definition_id,
        assignmentType: sched.assignment_type,
        frequency: sched.frequency,
        dayOfWeek: sched.day_of_week,
        customCron: sched.custom_cron,
        requiresApproval: sched.requires_approval,
        requiresPhoto: sched.requires_photo,
        isActive: sched.is_active,
        createdAt: sched.created_at,
        updatedAt: sched.updated_at,
        assignments: sched.id === choreSchedule.id ? (assignmentsWithMembers || []).map(assignment => ({
          id: assignment.id,
          choreScheduleId: assignment.chore_schedule_id,
          memberId: assignment.member_id,
          rotationOrder: assignment.rotation_order,
          isActive: assignment.is_active,
          member: assignment.member
        })) : []
      })) || []
    } : null;

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'CHORE_CREATED',
      entity_type: 'CHORE',
      entity_id: definition.id,
      result: 'SUCCESS',
      metadata: { name },
    });

    // Generate initial chore instances for the next 7 days
    try {
      const lookAheadDays = 7;
      const startDate = new Date();
      
      const dueDates = getNextDueDates(
        choreSchedule.frequency,
        startDate,
        lookAheadDays,
        choreSchedule.day_of_week
      );

      let lastAssigneeId: string | null = null;

      for (const dueDate of dueDates) {
        let assigneeId: string | null = null;

        if (choreSchedule.assignment_type === 'FIXED') {
          assigneeId = assignments[0].member_id;
          if (assigneeId) {
            const inSickMode = await isMemberInSickMode(assigneeId);
            if (!inSickMode) {
              await supabase.from('chore_instances').insert({
                chore_schedule_id: choreSchedule.id,
                assigned_to_id: assigneeId,
                due_date: dueDate.toISOString(),
                status: 'PENDING',
              });
            }
          }
        } else if (choreSchedule.assignment_type === 'ROTATING') {
          assigneeId = getNextAssignee(
            assignments.map((a: any) => ({
              memberId: a.member_id,
              rotationOrder: a.rotation_order,
            })),
            lastAssigneeId
          );
          if (assigneeId) {
            const inSickMode = await isMemberInSickMode(assigneeId);
            if (!inSickMode) {
              await supabase.from('chore_instances').insert({
                chore_schedule_id: choreSchedule.id,
                assigned_to_id: assigneeId,
                due_date: dueDate.toISOString(),
                status: 'PENDING',
              });
              lastAssigneeId = assigneeId; // Track for rotation
            }
          }
        } else if (choreSchedule.assignment_type === 'OPT_IN') {
          for (const assignment of assignments) {
            const inSickMode = await isMemberInSickMode(assignment.member_id);
            if (!inSickMode) {
              await supabase.from('chore_instances').insert({
                chore_schedule_id: choreSchedule.id,
                assigned_to_id: assignment.member_id,
                due_date: dueDate.toISOString(),
                status: 'PENDING',
              });
            }
          }
        }
      }
    } catch (instanceError) {
      logger.error('Error generating initial chore instances:', instanceError);
      // Don't fail the chore creation if instance generation fails
    }

    return NextResponse.json({
      success: true,
      chore: completeChoreWithRelations,
      message: 'Chore created successfully',
    });
  } catch (error) {
    logger.error('Error creating chore', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
