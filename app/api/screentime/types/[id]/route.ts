import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateScreenTimeType, deleteScreenTimeType } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

/**
 * GET /api/screentime/types/[id]
 * Get a specific screen time type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { data: type, error } = await supabase
      .from('screen_time_types')
      .select('*')
      .eq('id', id)
      .eq('family_id', familyId)
      .single();

    if (error || !type) {
      return NextResponse.json(
        { error: 'Screen time type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ type });
  } catch (error) {
    logger.error('Error fetching screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time type' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify type exists
    const { data: existing } = await supabase
      .from('screen_time_types')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Screen time type not found' }, { status: 404 });
    }

    const body = await request.json();
    const type = await updateScreenTimeType(id, body);

    return NextResponse.json({
      success: true,
      type,
      message: 'Screen time type updated successfully',
    });
  } catch (error) {
    logger.error('Error updating screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to update screen time type' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify type exists
    const { data: existing } = await supabase
      .from('screen_time_types')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Screen time type not found' }, { status: 404 });
    }

    await deleteScreenTimeType(id);

    return NextResponse.json({
      success: true,
      message: 'Screen time type deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to delete screen time type' },
      { status: 500 }
    );
  }
}
