import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getScreenTimeHistory } from '@/lib/data/screentime';
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const queryMemberId = searchParams.get('memberId');

    // Determine which member's history to fetch
    let targetMemberId = currentMemberId;
    if (queryMemberId) {
      // If requesting another member's history, verify parent access
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
      }

      // Verify member belongs to same family
      const { data: targetMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', queryMemberId)
        .single();

      if (!targetMember || targetMember.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetMemberId = queryMemberId;
    }

    const history = await getScreenTimeHistory(targetMemberId, startDate, endDate);

    return NextResponse.json({ history });
  } catch (error) {
    logger.error('Get screen time history error:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
