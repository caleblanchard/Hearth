import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can approve redemptions
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden - Parent access required' }, { status: 403 });
    }

    const { id } = await params;

    // Get redemption
    const { data: redemption } = await (supabase as any)
      .from('reward_redemptions')
      .select(`
        *,
        reward:reward_items!inner(*, family_id),
        member:family_members!member_id(id, name)
      `)
      .eq('id', id)
      .single();

    if (!redemption) {
      return NextResponse.json(
        { error: 'Redemption not found' },
        { status: 404 }
      );
    }

    if (redemption.reward.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (redemption.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This redemption has already been processed' },
        { status: 400 }
      );
    }

    // Approve redemption
    const { data: approved, error } = await supabase
      .from('reward_redemptions')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by_id: memberId,
      })
      .eq('id', id)
      .select(`
        *,
        reward:reward_items(*),
        member:family_members!member_id(id, name)
      `)
      .single();

    if (error) {
      logger.error('Error approving redemption:', error);
      return NextResponse.json({ error: 'Failed to approve redemption' }, { status: 500 });
    }

    // Notify child that their reward was approved
    await supabase.from('notifications').insert({
      user_id: redemption.member_id,
      type: 'REWARD_APPROVED',
      title: 'Reward approved!',
      message: `Your reward "${redemption.reward.name}" has been approved!`,
      action_url: '/dashboard/rewards/redemptions',
      metadata: {
        redemptionId: id,
        rewardName: redemption.reward.name,
        approvedBy: authContext.memberships[0]?.name,
      },
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'REWARD_APPROVED',
      entity_type: 'REWARD',
      entity_id: id,
      result: 'SUCCESS',
      metadata: { rewardName: redemption.reward.name, memberName: redemption.member.name },
    });

    return NextResponse.json({
      success: true,
      redemption: approved,
      message: `Approved ${redemption.member.name}'s redemption of "${redemption.reward.name}"`,
    });
  } catch (error) {
    logger.error('Approve redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to approve redemption' },
      { status: 500 }
    );
  }
}
