import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getGraceHistory } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const currentMemberId = authContext.defaultMemberId;

    if (!familyId || !currentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const memberId = queryMemberId || currentMemberId;

    // If viewing another member's history, verify permissions
    if (memberId !== currentMemberId) {
      const isParent = await isParentInFamily(currentMemberId, familyId);
      if (!isParent) {
        return NextResponse.json(
          { error: 'Cannot view other members history' },
          { status: 403 }
        );
      }

      // Verify member belongs to same family
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', memberId)
        .single();

      if (!member || member.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    const history = await getGraceHistory(memberId, { limit, offset });

    return NextResponse.json({ history });
  } catch (error) {
    logger.error('Get grace history error:', error);
    return NextResponse.json(
      { error: 'Failed to get grace history' },
      { status: 500 }
    );
  }
}
