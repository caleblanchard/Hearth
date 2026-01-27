import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { endSickMode } from '@/lib/data/health';
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
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { instanceId } = body;

    if (!instanceId) {
      return NextResponse.json({ error: 'Instance ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: instance } = await supabase
      .from('sick_mode_instances')
      .select('family_id, is_active')
      .eq('id', instanceId)
      .maybeSingle();

    if (!instance || instance.family_id !== familyId) {
      return NextResponse.json({ error: 'Sick mode instance not found' }, { status: 404 });
    }

    if (!instance.is_active) {
      return NextResponse.json({ error: 'Sick mode is already ended' }, { status: 409 });
    }

    const result = await endSickMode(instanceId, memberId);

    return NextResponse.json({
      success: true,
      instance: result.instance,
      message: 'Sick mode ended successfully',
    });
  } catch (error) {
    logger.error('End sick mode error:', error);
    return NextResponse.json({ error: 'Failed to end sick mode' }, { status: 500 });
  }
}
