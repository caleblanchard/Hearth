import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { createRoutine, getTodayCompletions } from '@/lib/data/routines';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    const userRole = authContext.memberships[0]?.role;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');

    const supabase = await createClient();

    let routinesQuery = supabase
      .from('routines')
      .select(`*, steps:routine_steps(*)`)
      .eq('family_id', familyId)
      .order('name');

    if (type) routinesQuery = routinesQuery.eq('type', type as any);
    if (assignedTo) routinesQuery = routinesQuery.eq('assigned_to', assignedTo);
    if (userRole === 'CHILD') {
      routinesQuery = routinesQuery.or(`assigned_to.eq.${memberId},assigned_to.is.null`);
    }

    const [rawRoutinesResult, todayCompletions] = await Promise.all([
      routinesQuery,
      getTodayCompletions(memberId),
    ]);

    if (rawRoutinesResult.error) throw rawRoutinesResult.error;
    const rawRoutines = rawRoutinesResult.data || [];

    const completedRoutineIds = new Map(
      todayCompletions.map((c: any) => [c.routine_id, c.completed_at])
    );

    const routines = rawRoutines.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      assignedTo: r.assigned_to,
      isWeekday: r.is_weekday,
      isWeekend: r.is_weekend,
      steps: (r.steps || [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          icon: item.icon,
          estimatedMinutes: item.estimated_minutes,
          sortOrder: item.sort_order,
        })),
      completedToday: completedRoutineIds.has(r.id),
      completedAt: completedRoutineIds.get(r.id) || null,
    }));

    return NextResponse.json({ routines });
  } catch (error) {
    logger.error('Error fetching routines:', error);
    return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
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

    // Only parents can create routines
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Only parents can create routines' }, { status: 403 });
    }

    const body = await request.json();
    const { name, timeOfDay, type, assignedTo, description, steps, isWeekday, isWeekend } = body;

    const routineType = type || timeOfDay || 'CUSTOM';

    // Validation
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!routineType || routineType === 'INVALID_TYPE') {
      return NextResponse.json({ error: 'Valid type is required' }, { status: 400 });
    }

    if (assignedTo) {
      const { data: member } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', assignedTo)
        .eq('family_id', familyId)
        .single();
      
      if (!member) {
        return NextResponse.json({ error: 'Assigned family member not found' }, { status: 400 });
      }
    }

    // Use data module
    const routine = await createRoutine({
      family_id: familyId,
      name: name.trim(),
      type: routineType,
      assigned_to: assignedTo || null,
      is_weekday: isWeekday !== undefined ? isWeekday : true,
      is_weekend: isWeekend !== undefined ? isWeekend : true,
    });

    if (steps && Array.isArray(steps)) {
      const itemsPayload = steps.map((step: any, index: number) => ({
        routine_id: routine.id,
        name: step.name,
        icon: step.icon,
        estimated_minutes: step.estimatedMinutes,
        sort_order: typeof step.sortOrder === 'number' ? step.sortOrder : index,
      }));

      const { data: insertedSteps } = await supabase
        .from('routine_steps')
        .insert(itemsPayload)
        .select();

      (routine as any).steps = (insertedSteps || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        sortOrder: item.sort_order,
        estimatedMinutes: item.estimated_minutes,
      }));
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'ROUTINE_CREATED',
      entity_type: 'ROUTINE',
      entity_id: routine.id,
      result: 'SUCCESS',
      metadata: {
        name: routine.name,
        type: routine.type,
      },
    });

    return NextResponse.json(
      { routine, message: 'Routine created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating routine:', error);
    return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
  }
}
