import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { completeRoutine, wasRoutineCompletedToday } from '@/lib/data/routines';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    const role = authContext.memberships.find(m => m.id === memberId)?.role;

    // Get the routine
    const { data: routine } = await supabase
      .from('routines')
      .select('family_id, assigned_to, name')
      .eq('id', id)
      .single();

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to complete this routine' },
        { status: 403 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body is optional
    }
    const { completedItems, memberId: targetMemberId } = body as { completedItems?: string[], memberId?: string };

    const completerId = targetMemberId || memberId;

    // If completing for someone else, verify parent role
    if (completerId !== memberId) {
      if (role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Only parents can complete routines for others' },
          { status: 403 }
        );
      }

      // Verify target member exists in family
      const { data: targetMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', completerId)
        .eq('family_id', familyId)
        .single();

      if (!targetMember) {
        return NextResponse.json(
          { error: 'Target family member not found' },
          { status: 400 }
        );
      }
    }

    // Verify assignment if set
    if (routine.assigned_to && routine.assigned_to !== completerId) {
      // If user is child, they can only complete their own routines
      // Parents can complete anyone's (already checked above for cross-completion)
      // But if child calls for themselves on a routine assigned to someone else:
      if (role !== 'PARENT') {
         return NextResponse.json(
          { error: 'This routine is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate completion
    const isDuplicate = await wasRoutineCompletedToday(id, completerId);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Routine already completed today' },
        { status: 400 }
      );
    }

    const completion = await completeRoutine(id, completerId, completedItems || []);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      actor_id: memberId,
      action: 'ROUTINE_COMPLETED',
      entity_type: 'ROUTINE',
      entity_id: id,
      details: {
        routineName: routine.name,
        completedBy: completerId,
        completedItemsCount: completedItems?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      completion,
      message: 'Routine completed successfully',
    }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002' || error.message?.includes('Unique constraint failed')) {
      return NextResponse.json({ error: 'Routine already completed today' }, { status: 400 });
    }
    logger.error('Complete routine error:', error);
    return NextResponse.json({ error: 'Failed to complete routine' }, { status: 500 });
  }
}
