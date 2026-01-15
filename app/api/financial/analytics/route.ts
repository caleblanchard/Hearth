import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getFinancialAnalytics } from '@/lib/data/financial';
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

    // Only parents can view analytics for other members
    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (targetMemberId && targetMemberId !== memberId) {
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    const analyticsData = await getFinancialAnalytics(familyId, targetMemberId || memberId, { startDate, endDate });

    // Transform to match frontend expectations
    const response = {
      summary: {
        totalIncome: analyticsData.totalIncome,
        totalExpenses: analyticsData.totalExpenses,
        netChange: analyticsData.netBalance,
        averageTransaction: analyticsData.transactionCount > 0 
          ? (analyticsData.totalIncome + analyticsData.totalExpenses) / analyticsData.transactionCount 
          : 0,
        transactionCount: analyticsData.transactionCount,
      },
      spendingByCategory: Object.entries(analyticsData.byCategory).map(([category, data]) => ({
        category,
        amount: data.total,
      })),
      trends: analyticsData.trends.map(t => ({
        periodKey: t.date,
        income: t.income,
        expenses: t.expenses,
      })),
      period: startDate && endDate ? 'custom' : 'monthly',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Get financial analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
