import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getScreenTimeStats } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

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
    const queryMemberId = searchParams.get('memberId');
    const periodParam = searchParams.get('period') || 'week';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range from period if not provided
    let startDate: string;
    let endDate: string;
    if (startDateParam && endDateParam) {
      startDate = startDateParam;
      endDate = endDateParam;
    } else {
      const now = new Date();
      if (periodParam === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart.toISOString();
        endDate = now.toISOString();
      } else if (periodParam === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString();
        endDate = now.toISOString();
      } else {
        // Default to last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString();
        endDate = now.toISOString();
      }
    }

    // Determine which member's stats to fetch
    let targetMemberId = currentMemberId;
    if (queryMemberId) {
      // If requesting another member's stats, verify parent access
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

    const stats = await getScreenTimeStats(targetMemberId, startDate, endDate);

    // Get current balance from allowances
    const { data: allowances } = await supabase
      .from('screen_time_allowances')
      .select('allowance_minutes')
      .eq('member_id', targetMemberId);

    // Calculate current balance from transactions, not from allowances table
    // (remaining_minutes field doesn't exist in schema)
    const weeklyAllocation = allowances?.reduce((sum, a) => sum + (a.allowance_minutes || 0), 0) || 0;
    const currentBalance = weeklyAllocation; // Simplified - full calculation would need transactions

    // Calculate days in period for average
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));

    // Transform to match frontend expectations
    const response = {
      summary: {
        totalMinutes: stats.totalMinutes,
        totalHours: Math.floor(stats.totalMinutes / 60),
        averagePerDay: Math.round(stats.totalMinutes / days),
        currentBalance,
        weeklyAllocation,
      },
      deviceBreakdown: Object.entries(stats.byType).map(([device, minutes]) => ({
        device,
        minutes,
      })),
      dailyTrend: [], // Not implemented yet
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Get screen time stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
