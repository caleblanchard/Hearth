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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view approval queue
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view the approval queue' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const memberIdFilter = searchParams.get('memberId');

    const { data: choreInstances } = await (supabase as any)
      .from('chore_instances')
      .select(`
        *,
        assignedTo:family_members!chore_instances_assigned_to_id_fkey(id, name, avatar_url),
        choreSchedule:chore_schedules(
          choreDefinition:chore_definitions(name, credit_value, family_id)
        )
      `)
      .eq('status', 'COMPLETED');

    const { data: rewardRedemptions } = await (supabase as any)
      .from('reward_redemptions')
      .select(`
        *,
        member:family_members(id, name, avatar_url),
        reward:reward_items(name, cost_credits, family_id)
      `)
      .eq('status', 'PENDING');

    const { data: shoppingItems } = await (supabase as any)
      .from('shopping_items')
      .select(`
        *,
        requestedBy:family_members(id, name, avatar_url)
      `)
      .eq('status', 'PENDING');

    const now = new Date();

    const approvals = [
      ...(choreInstances || [])
        .filter(
          (item: any) =>
            item.choreSchedule?.choreDefinition?.family_id === familyId ||
            item.choreSchedule?.choreDefinition?.familyId === familyId
        )
        .map((item: any) => ({
          id: `chore-${item.id}`,
          type: 'CHORE_COMPLETION',
          familyMemberId: item.assignedTo?.id ?? item.assigned_to_id ?? item.assignedToId,
          familyMemberName: item.assignedTo?.name,
          familyMemberAvatarUrl: item.assignedTo?.avatar_url ?? item.assignedTo?.avatarUrl ?? null,
          title: item.choreSchedule?.choreDefinition?.name || 'Chore',
          date: item.completed_at ?? item.completedAt,
          priority: item.photo_url || item.photoUrl ? 'HIGH' : 'NORMAL',
          metadata: {
            credits: item.choreSchedule?.choreDefinition?.credit_value ?? item.choreSchedule?.choreDefinition?.creditValue ?? 0,
            notes: item.notes ?? null,
            photoUrl: item.photo_url ?? item.photoUrl ?? null,
          },
        })),
      ...(rewardRedemptions || [])
        .filter(
          (item: any) =>
            item.reward?.family_id === familyId || item.reward?.familyId === familyId
        )
        .map((item: any) => {
          const requestedAt = new Date(item.requested_at ?? item.requestedAt);
          const hoursOld = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);
          const costCredits = item.reward?.cost_credits ?? item.reward?.costCredits ?? 0;
          const highPriority = hoursOld >= 24 || costCredits >= 100;

          return {
            id: `reward-${item.id}`,
            type: 'REWARD_REDEMPTION',
            familyMemberId: item.member?.id ?? item.member_id ?? item.memberId,
            familyMemberName: item.member?.name,
            familyMemberAvatarUrl: item.member?.avatar_url ?? item.member?.avatarUrl ?? null,
            title: item.reward?.name || 'Reward',
            date: requestedAt,
            priority: highPriority ? 'HIGH' : 'NORMAL',
            metadata: {
              costCredits,
            },
          };
        }),
      ...(shoppingItems || []).map((item: any) => ({
        id: `shopping-${item.id}`,
        type: 'SHOPPING_ITEM',
        familyMemberId: item.requestedBy?.id ?? item.requested_by ?? item.requestedById,
        familyMemberName: item.requestedBy?.name,
        familyMemberAvatarUrl: item.requestedBy?.avatar_url ?? item.requestedBy?.avatarUrl ?? null,
        title: item.name,
        date: item.created_at ?? item.createdAt,
        priority: 'NORMAL',
        metadata: {},
      })),
    ];

    let filtered = approvals;
    if (typeFilter) {
      filtered = filtered.filter((a: any) => a.type === typeFilter);
    }
    if (memberIdFilter) {
      filtered = filtered.filter((a: any) => a.familyMemberId === memberIdFilter);
    }

    filtered.sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json({
      approvals: filtered,
      total: filtered.length,
    });
  } catch (error) {
    logger.error('Approvals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
