import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const normalizeTransaction = (t: any) => ({
  ...t,
  createdAt: t.created_at ?? t.createdAt,
  amountMinutes: t.amount_minutes ?? t.amountMinutes,
  balanceAfter: t.balance_after ?? t.balanceAfter ?? null,
  deviceType: t.device_type ?? t.deviceType ?? null,
  memberId: t.member_id ?? t.memberId,
  screenTimeTypeId: t.screen_time_type_id ?? t.screenTimeTypeId ?? null,
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const currentMemberId = authContext.activeMemberId;

    if (!familyId || !currentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const queryMemberId = searchParams.get('memberId');
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Determine which member's history to fetch
    let targetMemberId = currentMemberId;
    if (queryMemberId) {
      // If requesting another member's history, verify parent access
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
      }

      // Verify member belongs to same family
      const { data: targetMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', queryMemberId)
        .single();

      if (!targetMember || targetMember.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetMemberId = queryMemberId;
    }

    let query = supabase
      .from('screen_time_transactions')
      .select(
        `
        *,
        createdBy:family_members!screen_time_transactions_created_by_id_fkey(id, name),
        screenTimeType:screen_time_types(id, name)
      `
      )
      .eq('member_id', targetMemberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions } = await query;
    const { count } = await supabase
      .from('screen_time_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', targetMemberId);

    return NextResponse.json({
      transactions: (transactions || []).map(normalizeTransaction),
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + (transactions?.length || 0) < (count || 0),
      },
    });
  } catch (error) {
    logger.error('Get screen time history error:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
