import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { startSickMode, getSickModeSettings, updateSickModeSettings } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily( familyId);
    
    const body = await request.json();
    const { memberId: targetMemberId, healthEventId, notes } = body;

    if (!isParent) {
      if (targetMemberId !== memberId) {
        return NextResponse.json({ error: 'Children can only start sick mode for themselves' }, { status: 403 });
      }
    }

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify member exists and belongs to family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', targetMemberId)
      .maybeSingle();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check for existing active instance
    const { data: existingInstance } = await supabase
      .from('sick_mode_instances')
      .select('id')
      .eq('member_id', targetMemberId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingInstance) {
      return NextResponse.json({ error: 'Sick mode is already active for this member' }, { status: 409 });
    }

    // Ensure settings exist (create defaults if needed)
    let settings = await getSickModeSettings(familyId);
    if (!settings) {
      settings = await updateSickModeSettings(familyId, {});
    }

    const triggeredBy = healthEventId ? 'AUTO_FROM_HEALTH_EVENT' : 'MANUAL';
    const instance = await startSickMode(targetMemberId, memberId, notes, healthEventId, triggeredBy);

    return NextResponse.json({
      success: true,
      instance,
      settings,
      message: 'Sick mode started successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Start sick mode error:', error);
    return NextResponse.json({ error: 'Failed to start sick mode' }, { status: 500 });
  }
}
