import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { calculateAnalytics, getSpendingByCategory, getTrends } from '@/lib/financial-analytics';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (targetMemberId && targetMemberId !== memberId) {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    let query = supabase
      .from('credit_transactions')
      .select('id, type, amount, category, created_at')
      .eq('member.family_id', familyId)
      .order('created_at', { ascending: false });

    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    } else {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        query = query.eq('member_id', memberId);
      }
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate));
    }
    if (endDate) {
      query = query.lte('created_at', new Date(endDate));
    }

    const { data: transactions } = await query;

    const summary = calculateAnalytics(transactions || []);
    const spendingByCategory = getSpendingByCategory(transactions || []);
    const trends = getTrends(transactions || []);

    return NextResponse.json({
      summary,
      spendingByCategory,
      trends,
      period: startDate && endDate ? 'custom' : 'monthly',
    });
  } catch (error) {
    logger.error('Get financial analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
