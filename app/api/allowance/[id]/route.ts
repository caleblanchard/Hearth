import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Fetch schedule and verify family ownership
    const { data: schedule, error } = await supabase
      .from('allowance_schedules')
      .select(`
        *,
        member:family_members!inner(id, name, email, family_id)
      `)
      .eq('id', params.id)
      .single();

    if (error || !schedule || schedule.member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    logger.error('Get allowance schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allowance schedule' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only parents can update
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Verify schedule exists and belongs to family
    const { data: existing } = await supabase
      .from('allowance_schedules')
      .select('*, member:family_members!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!existing || existing.member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      );
    }

    // Update schedule
    const { data: schedule, error } = await supabase
      .from('allowance_schedules')
      .update(body)
      .eq('id', params.id)
      .select(`
        *,
        member:family_members(id, name, email)
      `)
      .single();

    if (error) {
      logger.error('Error updating allowance schedule:', error);
      return NextResponse.json({ error: 'Failed to update allowance schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Allowance schedule updated successfully',
    });
  } catch (error) {
    logger.error('Update allowance schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to update allowance schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only parents can delete
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify schedule exists and belongs to family
    const { data: existing } = await supabase
      .from('allowance_schedules')
      .select('*, member:family_members!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!existing || existing.member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      );
    }

    // Delete schedule
    const { error } = await supabase
      .from('allowance_schedules')
      .delete()
      .eq('id', params.id);

    if (error) {
      logger.error('Error deleting allowance schedule:', error);
      return NextResponse.json({ error: 'Failed to delete allowance schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Allowance schedule deleted successfully',
    });
  } catch (error) {
    logger.error('Delete allowance schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to delete allowance schedule' },
      { status: 500 }
    );
  }
}
