import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRoutine, updateRoutine, deleteRoutine } from '@/lib/data/routines';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const routine = await getRoutine(params.id);

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
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify routine exists
    const existing = await getRoutine(params.id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    const body = await request.json();
    const routine = await updateRoutine(params.id, body);

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
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify routine exists
    const existing = await getRoutine(params.id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    await deleteRoutine(params.id);

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
