import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getGraceSettings, updateGraceSettings } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const currentMemberId = authContext.activeMemberId;

    if (!familyId || !currentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get memberId from query params (optional)
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const memberId = queryMemberId || currentMemberId;

    // If viewing another member's settings, verify permissions
    if (memberId !== currentMemberId) {
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json(
          { error: 'Cannot view other members settings' },
          { status: 403 }
        );
      }

      // Verify member belongs to family
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', memberId)
        .single();

      if (!member || member.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    const settings = await getGraceSettings(memberId);

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Get grace settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get grace settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const currentMemberId = authContext.activeMemberId;

    if (!familyId || !currentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { memberId: targetMemberId } = body;
    const memberId = targetMemberId || currentMemberId;

    // If updating another member's settings, verify permissions
    if (memberId !== currentMemberId) {
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json(
          { error: 'Cannot update other members settings' },
          { status: 403 }
        );
      }

      // Verify member belongs to family
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', memberId)
        .single();

      if (!member || member.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    const settings = await updateGraceSettings(memberId, body);

    return NextResponse.json({
      success: true,
      settings,
      message: 'Grace settings updated successfully',
    });
  } catch (error) {
    logger.error('Update grace settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update grace settings' },
      { status: 500 }
    );
  }
}
