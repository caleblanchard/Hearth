import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRoutine, updateRoutine, deleteRoutine } from '@/lib/data/routines';
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

    const routine = await getRoutine(id);

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this routine' },
        { status: 403 }
      );
    }

    return NextResponse.json({ routine });
  } catch (error) {
    logger.error('Routine API - GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routine' },
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

    // Verify routine exists
    const existing = await getRoutine(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Check permissions - only parents can update routines
    const role = authContext.user?.role;
    if (role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { steps, ...updates } = body;

    const routine = await updateRoutine(id, updates);

    if (steps && Array.isArray(steps)) {
      // Replace steps
      // 1. Delete existing
      await supabase.from('routine_steps').delete().eq('routine_id', id);

      // 2. Insert new
      const itemsPayload = steps.map((step: any, index: number) => ({
        routine_id: id,
        name: step.name,
        icon: step.icon,
        estimated_minutes: step.estimatedMinutes,
        sort_order: typeof step.sortOrder === 'number' ? step.sortOrder : index,
      }));

      if (itemsPayload.length > 0) {
        await supabase.from('routine_steps').insert(itemsPayload);
      }
      
      (routine as any).steps = itemsPayload.map((item: any) => ({
        ...item,
        sortOrder: item.sort_order,
        estimatedMinutes: item.estimated_minutes,
      }));
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'ROUTINE_UPDATED',
      entity_type: 'ROUTINE',
      entity_id: routine.id,
      result: 'SUCCESS',
      metadata: {
        name: routine.name,
        type: routine.type,
      },
    });

    return NextResponse.json({
      success: true,
      routine,
      message: 'Routine updated successfully',
    });
  } catch (error) {
    logger.error('Routine API - PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update routine' },
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

    // Verify routine exists
    const existing = await getRoutine(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Check permissions - only parents can delete routines
    const role = authContext.user?.role;
    if (role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteRoutine(id);

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'ROUTINE_DELETED',
      entity_type: 'ROUTINE',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        name: existing.name,
        type: existing.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Routine deleted successfully',
    });
  } catch (error) {
    logger.error('Routine API - DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete routine' },
      { status: 500 }
    );
  }
}
