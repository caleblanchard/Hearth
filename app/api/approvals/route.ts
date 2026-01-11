import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Only parents can view approval queue
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view the approval queue' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const memberIdFilter = searchParams.get('memberId');

    // Fetch pending chore completions (COMPLETED status, awaiting approval)
    const { data: choreCompletions } = await supabase
      .from('chore_completions')
      .select(`
        *,
        assignment:chore_assignments!inner(
          *,
          schedule:chore_schedules!inner(
            *,
            definition:chore_definitions!inner(name, credit_value, family_id)
          )
        ),
        member:family_members!inner(id, name, avatar_url)
      `)
      .eq('status', 'COMPLETED')
      .eq('assignment.schedule.definition.family_id', familyId)
      .order('completed_at', { ascending: true });

    // Fetch pending reward redemptions
    const { data: rewardRedemptions } = await supabase
      .from('reward_redemptions')
      .select(`
        *,
        reward:reward_items!inner(*, family_id),
        member:family_members!inner(id, name, avatar_url)
      `)
      .eq('status', 'PENDING')
      .eq('reward.family_id', familyId)
      .order('created_at', { ascending: true });

    // Format approvals
    const approvals = [
      ...(choreCompletions || []).map((c: any) => ({
        id: c.id,
        type: 'CHORE_COMPLETION',
        itemId: c.id,
        memberId: c.member_id,
        memberName: c.member.name,
        memberAvatar: c.member.avatar_url,
        title: c.assignment?.schedule?.definition?.name || 'Chore',
        description: c.notes || '',
        date: c.completed_at,
        priority: 'normal',
        metadata: {
          creditValue: c.assignment?.schedule?.definition?.credit_value || 0,
        },
      })),
      ...(rewardRedemptions || []).map((r: any) => ({
        id: r.id,
        type: 'REWARD_REDEMPTION',
        itemId: r.id,
        memberId: r.member_id,
        memberName: r.member.name,
        memberAvatar: r.member.avatar_url,
        title: r.reward.name,
        description: r.notes || '',
        date: r.created_at,
        priority: 'normal',
        metadata: {
          costCredits: r.reward.cost_credits,
        },
      })),
    ];

    // Apply filters
    let filtered = approvals;
    if (typeFilter) {
      filtered = filtered.filter((a: any) => a.type === typeFilter);
    }
    if (memberIdFilter) {
      filtered = filtered.filter((a: any) => a.memberId === memberIdFilter);
    }

    // Sort by date
    filtered.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      approvals: filtered,
      count: filtered.length,
    });
  } catch (error) {
    logger.error('Approvals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
