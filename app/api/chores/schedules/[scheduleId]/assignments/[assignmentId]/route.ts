import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { removeChoreAssignment } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string; assignmentId: string } }
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

    // Verify assignment exists
    const { data: existingAssignment } = await supabase
      .from('chore_assignments')
      .select(`
        *,
        schedule:chore_schedules!inner(
          *,
          definition:chore_definitions!inner(family_id),
          assignments:chore_assignments!inner(*)
        )
      `)
      .eq('id', params.assignmentId)
      .eq('schedule.assignments.is_active', true)
      .single();

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify family ownership
    if (existingAssignment.schedule.definition.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent deleting last assignment
    if (existingAssignment.schedule.assignments.length <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last assignment from a schedule' }, { status: 400 });
    }

    // Soft delete assignment
    await removeChoreAssignment(params.assignmentId);

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    logger.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
