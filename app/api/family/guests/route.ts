import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getGuestInvites } from '@/lib/data/guests';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Only parents can view guest invites
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view guest invites' },
        { status: 403 }
      );
    }

    const invites = await getGuestInvites(familyId);

    return NextResponse.json({ invites });
  } catch (error) {
    logger.error('Get guest invites error:', error);
    return NextResponse.json({ error: 'Failed to get guest invites' }, { status: 500 });
  }
}
