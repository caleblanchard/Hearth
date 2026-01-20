import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/approvals/stats
 * 
 * Returns statistics about pending approvals
 */
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

    // Only parents can view approval stats
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view approval statistics' },
        { status: 403 }
      );
    }

    const [choreCount, rewardCount] = await Promise.all([
      supabase
        .from('chore_instances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'COMPLETED')
        .eq('chore_schedule.chore_definition.family_id', familyId),
      supabase
        .from('reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING')
        .eq('reward.family_id', familyId),
    ]);

    const { count: choreCompletions } = choreCount as any;
    const { count: rewardRedemptions } = rewardCount as any;

    const { data: oldestChore } = await supabase
      .from('chore_instances')
      .select('completed_at')
      .eq('status', 'COMPLETED')
      .eq('chore_schedule.chore_definition.family_id', familyId)
      .order('completed_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: oldestReward } = await supabase
      .from('reward_redemptions')
      .select('requested_at')
      .eq('status', 'PENDING')
      .eq('reward.family_id', familyId)
      .order('requested_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestChoreDate = oldestChore?.completed_at ?? oldestChore?.completedAt;
    const oldestRewardDate = oldestReward?.requested_at ?? oldestReward?.requestedAt;
    const oldestPending = [oldestChoreDate, oldestRewardDate]
      .filter(Boolean)
      .map((value) => new Date(value as any))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const total = (choreCompletions || 0) + (rewardRedemptions || 0);

    return NextResponse.json({
      total,
      byType: {
        choreCompletions: choreCompletions || 0,
        rewardRedemptions: rewardRedemptions || 0,
        shoppingRequests: 0,
        calendarRequests: 0,
      },
      byPriority: {
        high: 0,
        normal: total || 0,
        low: 0,
      },
      oldestPending: oldestPending ? oldestPending.toISOString() : undefined,
    });
  } catch (error) {
    logger.error('Approval stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval statistics' },
      { status: 500 }
    );
  }
}
