import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { CreditTransactionType, SpendingCategory } from '@/lib/enums';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const requestedMemberId = searchParams.get('memberId') || undefined;
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100);
    const offset = (page - 1) * limit;

    let targetMemberId = requestedMemberId;
    if (!targetMemberId) {
      const isParent = await isParentInFamily(familyId);
      targetMemberId = isParent ? undefined : memberId;
    }

    if (targetMemberId && targetMemberId !== memberId) {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        return NextResponse.json(
          { error: 'Unauthorized - Parent access required' },
          { status: 403 }
        );
      }

      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', targetMemberId)
        .single();

      if (!member || member.family_id !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    let query = supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    }
    if (type && Object.values(CreditTransactionType).includes(type as CreditTransactionType)) {
      query = query.eq('type', type as CreditTransactionType);
    }
    if (category && Object.values(SpendingCategory).includes(category as SpendingCategory)) {
      query = query.eq('category', category as SpendingCategory);
    }
    if (startDate) {
      query = query.gte('created_at', new Date(startDate));
    }
    if (endDate) {
      query = query.lte('created_at', new Date(endDate));
    }

    const { data: transactions, count } = await query;

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        hasMore: offset + (transactions?.length || 0) < (count || 0),
      },
    });
  } catch (error) {
    logger.error('Get financial transactions error:', error);
    return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 });
  }
}
