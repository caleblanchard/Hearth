import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
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

    // Only parents can view pending grace requests
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view pending grace requests' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const { data: requests } = await supabase
      .from('grace_period_logs')
      .select(
        `
        *,
        member:family_members(id, name, family_id)
      `
      )
      .eq('member.family_id', familyId)
      .is('approved_by_id', null)
      .eq('repayment_status', 'PENDING')
      .order('requested_at', { ascending: true });

    const results = await Promise.all(
      (requests || []).map(async (request: any) => {
        const { data: balance } = await supabase
          .from('screen_time_balances')
          .select('*')
          .eq('member_id', request.member_id ?? request.memberId)
          .single();

        return {
          id: request.id,
          memberId: request.member_id ?? request.memberId,
          memberName: request.member?.name,
          minutesGranted: request.minutes_granted ?? request.minutesGranted,
          reason: request.reason,
          requestedAt: new Date(request.requested_at ?? request.requestedAt).toISOString(),
          currentBalance: balance?.current_balance_minutes ?? balance?.currentBalanceMinutes ?? 0,
        };
      })
    );

    return NextResponse.json({ requests: results });
  } catch (error) {
    logger.error('Get pending grace requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending grace requests' },
      { status: 500 }
    );
  }
}
