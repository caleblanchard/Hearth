import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { addChoreAssignment } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: { scheduleId: string } }
) {
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

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify schedule exists and belongs to family
    const { data: existingSchedule } = await supabase
      .from('chore_schedules')
      .select(`
        *,
        chore_definition:chore_definitions!inner(family_id),
        assignments:chore_assignments!inner(*)
      `)
      .eq('id', params.scheduleId)
      .eq('assignments.is_active', true)
      .single();

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existingSchedule.chore_definition.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId: assignMemberId, rotationOrder } = body;

    // Validation
    if (!assignMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Verify member exists and belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', assignMemberId)
      .eq('family_id', familyId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Invalid member' }, { status: 400 });
    }

    // Check if member is already assigned
    const existingAssignment = existingSchedule.assignments?.find((a: any) => a.member_id === assignMemberId);
    if (existingAssignment) {
      return NextResponse.json({ error: 'Member is already assigned to this schedule' }, { status: 400 });
    }

    // If ROTATING, validate rotationOrder
    let finalRotationOrder = rotationOrder;
    if (existingSchedule.assignment_type === 'ROTATING') {
      if (rotationOrder == null) {
        // Auto-assign next rotation order
        const maxRotation = existingSchedule.assignments?.reduce((max: number, a: any) => Math.max(max, a.rotation_order || 0), -1) ?? -1;
        finalRotationOrder = maxRotation + 1;
      }
    }

    // Create assignment
    const newAssignment = await addChoreAssignment(params.scheduleId, assignMemberId, finalRotationOrder);

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message: 'Assignment created successfully',
    });
  } catch (error) {
    logger.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
