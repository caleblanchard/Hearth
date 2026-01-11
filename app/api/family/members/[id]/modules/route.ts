import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getMemberModuleAccess, updateMemberModuleAccess } from '@/lib/data/family';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Verify the member belongs to the same family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('id', id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const modules = await getMemberModuleAccess(id);

    return NextResponse.json({ modules });
  } catch (error) {
    logger.error('Get member module access error:', error);
    return NextResponse.json({ error: 'Failed to get module access' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Only parents can update module access
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    // Verify the member belongs to the same family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();
    const modules = await updateMemberModuleAccess(id, body.modules);

    return NextResponse.json({
      success: true,
      modules,
      message: 'Member module access updated successfully',
    });
  } catch (error) {
    logger.error('Update member module access error:', error);
    return NextResponse.json({ error: 'Failed to update module access' }, { status: 500 });
  }
}
