import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { approveChore } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only parents can approve
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden - Parent access required' }, { status: 403 });
    }

    const { id: completionId } = params;

    // Use RPC function for atomic approval with credit award
    const result = await approveChore(completionId, memberId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      chore: result.completion,
      creditsAwarded: result.credits_awarded,
      message: 'Chore approved successfully',
    });
  } catch (error) {
    logger.error('Error approving chore', error);
    return NextResponse.json({ error: 'Failed to approve chore' }, { status: 500 });
  }
}
