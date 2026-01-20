import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { calculateRemainingTime } from '@/lib/screentime-utils';
import { logger } from '@/lib/logger';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

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
    let startDate: Date;
    let endDate: Date;
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const now = new Date();
      if (periodParam === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        endDate = now;
      } else if (periodParam === 'month') {
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        startDate = monthStart;
        endDate = now;
      } else if (periodParam === 'all') {
        startDate = new Date(0);
        endDate = now;
      } else {
        // Default to last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo;
        endDate = now;
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

      const targetMember = useMockDb
        ? await (dbMock as any).familyMember.findUnique({
            where: { id: queryMemberId },
            select: { familyId: true },
          })
        : (await supabase
            .from('family_members')
            .select('family_id')
            .eq('id', queryMemberId)
            .single()).data;

      if (!targetMember || (targetMember.family_id ?? targetMember.familyId) !== familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetMemberId = queryMemberId;
    }

    const transactions = useMockDb
      ? await (dbMock as any).screenTimeTransaction.findMany({
          where: {
            memberId: targetMemberId,
            type: 'SPENT',
            createdAt: {
              gte: startDate,
            },
          },
          select: {
            amountMinutes: true,
            deviceType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })
      : (
          await supabase
            .from('screen_time_transactions')
            .select('amount_minutes, type, created_at, device_type')
            .eq('member_id', targetMemberId)
            .eq('type', 'SPENT')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true })
        ).data || [];

    const totalMinutes = (transactions || []).reduce(
      (sum: number, t: any) => sum + Math.abs(t.amountMinutes ?? t.amount_minutes ?? 0),
      0
    );

    const deviceTotals = (transactions || []).reduce((acc: Record<string, number>, t: any) => {
      const device = t.deviceType ?? t.device_type ?? 'Unknown';
      acc[device] = (acc[device] || 0) + Math.abs(t.amountMinutes ?? t.amount_minutes ?? 0);
      return acc;
    }, {});

    const dailyTotals = (transactions || []).reduce((acc: Record<string, number>, t: any) => {
      const created = t.createdAt ?? t.created_at;
      const date = created instanceof Date ? created : new Date(created);
      const key = date.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + Math.abs(t.amountMinutes ?? t.amount_minutes ?? 0);
      return acc;
    }, {});

    // Get current balance from allowances
    const allowances = useMockDb
      ? await (dbMock as any).screenTimeAllowance.findMany({
          where: { memberId: targetMemberId },
          include: { screenTimeType: { select: { id: true, name: true } } },
        })
      : (await supabase
          .from('screen_time_allowances')
          .select('screen_time_type_id, allowance_minutes')
          .eq('member_id', targetMemberId)).data;

    const remaining = useMockDb
      ? await Promise.all(
          (allowances || []).map((allowance: any) =>
            calculateRemainingTime(
              targetMemberId,
              allowance.screen_time_type_id ?? allowance.screenTimeTypeId
            )
          )
        )
      : [];

    const weeklyAllocation = useMockDb
      ? (
          await (dbMock as any).screenTimeSettings.findUnique({
            where: { memberId: targetMemberId },
          })
        )?.weeklyAllocationMinutes ?? 0
      : allowances?.reduce(
          (sum: number, allowance: { allowance_minutes?: number | null }) =>
            sum + (allowance?.allowance_minutes ?? 0),
          0
        ) || 0;
    const currentBalance = useMockDb
      ? (
          await (dbMock as any).screenTimeBalance.findUnique({
            where: { memberId: targetMemberId },
          })
        )?.currentBalanceMinutes ?? 0
      : (
          await (supabase as any)
            .from('screen_time_balances')
            .select('current_balance_minutes')
            .eq('member_id', targetMemberId)
            .single()
        ).data?.current_balance_minutes ?? 0;

    const sickModeInstance = useMockDb
      ? await (dbMock as any).sickModeInstance.findFirst({
          where: { memberId: targetMemberId, isActive: true },
        })
      : (await supabase
          .from('sick_mode_instances')
          .select('*')
          .eq('member_id', targetMemberId)
          .eq('is_active', true)
          .maybeSingle()).data;

    const sickModeSettings = useMockDb
      ? await (dbMock as any).sickModeSettings.findUnique({
          where: { familyId },
        })
      : (await supabase
          .from('sick_mode_settings')
          .select('screen_time_bonus')
          .eq('family_id', familyId)
          .single()).data;

    const sickModeBonus =
      sickModeInstance && (sickModeSettings?.screen_time_bonus ?? sickModeSettings?.screenTimeBonus)
        ? sickModeSettings?.screen_time_bonus ?? sickModeSettings?.screenTimeBonus
        : 0;

    // Calculate days in period for average
    const days = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Transform to match frontend expectations
    const response = {
      summary: {
        totalMinutes,
        totalHours: Math.floor(totalMinutes / 60),
        averagePerDay: Math.round(totalMinutes / days),
        currentBalance,
        weeklyAllocation,
        sickModeBonus,
        effectiveBalance: currentBalance + sickModeBonus,
      },
      deviceBreakdown: Object.entries(deviceTotals).map(([device, minutes]) => ({
        device,
        minutes,
      })),
      dailyTrend: Object.entries(dailyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, minutes]) => ({ date, minutes })),
      period: periodParam,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Get screen time stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time stats' },
      { status: 500 }
    );
  }
}
