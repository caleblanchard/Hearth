import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getPendingGraceRequests } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view pending grace requests
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view pending grace requests' },
        { status: 403 }
      );
    }

    const pendingRequests = await getPendingGraceRequests(familyId);

    return NextResponse.json({ pendingRequests });
  } catch (error) {
    logger.error('Get pending grace requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending requests' },
      { status: 500 }
    );
  }
}
