import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { rejectChore } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
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

    // Only parents can reject
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden - Parent access required' }, { status: 403 });
    }

    const { id: completionId } = await params;
    const { reason } = await request.json();

    // Use RPC function for rejection
    const result = await rejectChore(completionId, memberId, reason || '');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      chore: result.completion,
      message: 'Chore rejected. Please try again!',
    });
  } catch (error) {
    logger.error('Chore rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject chore' },
      { status: 500 }
    );
  }
}
