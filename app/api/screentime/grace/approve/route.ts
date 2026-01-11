import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { approveGracePeriod, rejectGracePeriod } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
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

    // Check if user is a parent
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can approve grace requests' },
        { status: 403 }
      );
    }

    const { graceLogId, approved } = await request.json();

    const result = approved
      ? await approveGracePeriod(graceLogId, memberId)
      : await rejectGracePeriod(graceLogId);

    return NextResponse.json({
      success: true,
      graceLog: result.graceLog,
      message: approved ? 'Grace period approved' : 'Grace period rejected',
    });
  } catch (error) {
    logger.error('Approve/reject grace period error:', error);
    return NextResponse.json(
      { error: 'Failed to process grace request' },
      { status: 500 }
    );
  }
}
