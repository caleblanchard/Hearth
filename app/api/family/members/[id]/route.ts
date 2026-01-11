import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { updateFamilyMember, deleteFamilyMember } from '@/lib/data/family';
import { logger } from '@/lib/logger';

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
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update members
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify member exists and belongs to family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', params.id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();
    const member = await updateFamilyMember(params.id, body);

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEMBER_UPDATED',
      entity_type: 'MEMBER',
      entity_id: params.id,
      result: 'SUCCESS',
      metadata: body,
    });

    return NextResponse.json({
      success: true,
      member,
      message: 'Family member updated successfully',
    });
  } catch (error) {
    logger.error('Error updating family member:', error);
    return NextResponse.json({ error: 'Failed to update family member' }, { status: 500 });
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
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can delete members
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify member exists and belongs to family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id, name')
      .eq('id', params.id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await deleteFamilyMember(params.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEMBER_DELETED',
      entity_type: 'MEMBER',
      entity_id: params.id,
      result: 'SUCCESS',
      metadata: { name: targetMember.name },
    });

    return NextResponse.json({
      success: true,
      message: 'Family member deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
