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

    // Verify reward exists and belongs to family
    const supabase = await createClient();
    const { data: rewardCheck } = await supabase
      .from('reward_items')
      .select('family_id')
      .eq('id', rewardId)
      .single();

    if (!rewardCheck) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (rewardCheck.family_id !== authContext.activeFamilyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use RPC function for atomic redemption
    const result = await redeemReward(rewardId, memberId) as any;

    if (!result || !result.success) {
      const errorMsg = result?.error || 'Failed to redeem reward';
      let status = 400;
      
      if (errorMsg === 'Reward not found') status = 404;
      else if (errorMsg === 'Forbidden') status = 403;
      
      return NextResponse.json(
        { error: errorMsg },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      message: 'Reward redeemed successfully! Awaiting parent approval.',
      budgetWarning: result.budgetWarning,
    });
  } catch (error) {
    console.log('DEBUG REDEEM ERROR:', error);
    logger.error('Redeem reward error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}
