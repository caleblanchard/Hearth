import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { rejectRewardRedemption } from '@/lib/data/credits';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can reject redemptions
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reason } = await request.json();

    const result = await rejectRewardRedemption(id, reason || null);

    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      message: 'Redemption rejected successfully',
    });
  } catch (error) {
    logger.error('Reject redemption error:', error);
    return NextResponse.json({ error: 'Failed to reject redemption' }, { status: 500 });
  }
}
