import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { rejectRewardRedemption } from '@/lib/data/credits';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can reject redemptions
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reason } = await request.json();

    // Verify redemption exists and belongs to family
    const { data: redemptionCheck } = await supabase
      .from('reward_redemptions')
      .select('*, reward:reward_items(family_id, name, cost_credits)')
      .eq('id', id)
      .single();

    if (!redemptionCheck) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    if (redemptionCheck.reward?.family_id !== familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (redemptionCheck.status !== 'PENDING') {
      return NextResponse.json({ error: 'This redemption has already been processed' }, { status: 400 });
    }

    const redemption = await rejectRewardRedemption(id, reason || null);

    // Notify child that their reward was rejected
    await supabase.from('notifications').insert({
      user_id: redemption.member_id,
      type: 'REWARD_REJECTED',
      title: 'Reward declined',
      message: `Your reward "${redemptionCheck.reward.name}" was not approved.`,
      action_url: '/dashboard/rewards',
      metadata: {
        redemptionId: id,
        rewardName: redemptionCheck.reward.name,
        creditsRefunded: redemptionCheck.reward.cost_credits,
        rejectionReason: reason || 'No reason provided',
        rejectedBy: authContext.memberships[0]?.name,
      },
    });

    return NextResponse.json({
      success: true,
      redemption,
      message: 'Redemption rejected successfully',
    });
  } catch (error) {
    logger.error('Reject redemption error:', error);
    const message = (error as Error).message;
    if (message === 'Redemption not found') return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: 'Failed to reject redemption' }, { status: 500 });
  }
}
