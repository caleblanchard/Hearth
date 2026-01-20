import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { redeemReward } from '@/lib/data/credits';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const { id: rewardId } = await params;
    
    // Validate JSON input
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { notes } = body;

    // Use RPC function for atomic redemption
    const result = await redeemReward(rewardId, memberId) as any;

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to redeem reward' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      message: 'Reward redeemed successfully! Awaiting parent approval.',
      budgetWarning: result.budgetWarning,
    });
  } catch (error) {
    logger.error('Redeem reward error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}
