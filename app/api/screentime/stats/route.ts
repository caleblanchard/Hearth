import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId'); // For parent viewing child's stats
    const period = searchParams.get('period') || 'week'; // week, month, all

    // Determine which member's stats to fetch
    let targetMemberId = session.user.id;
    if (memberId) {
      // If requesting another member's stats, verify parent access
      if (session.user.role !== 'PARENT') {
        return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
      }

      // Verify member belongs to same family
      const targetMember = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { familyId: true },
      });

      if (!targetMember || targetMember.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetMemberId = memberId;
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get all spent transactions for the period
    const spentTransactions = await prisma.screenTimeTransaction.findMany({
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
    });

    // Calculate total usage
    const totalMinutes = spentTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amountMinutes),
      0
    );

    // Group by device type
    const deviceBreakdown: Record<string, number> = {};
    spentTransactions.forEach((t) => {
      const device = t.deviceType || 'OTHER';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + Math.abs(t.amountMinutes);
    });

    // Group by day for trend data
    const dailyUsage: Record<string, number> = {};
    spentTransactions.forEach((t) => {
      const day = t.createdAt.toISOString().split('T')[0];
      dailyUsage[day] = (dailyUsage[day] || 0) + Math.abs(t.amountMinutes);
    });

    // Convert to arrays for charting
    const dailyTrend = Object.entries(dailyUsage)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const deviceData = Object.entries(deviceBreakdown).map(([device, minutes]) => ({
      device,
      minutes,
    }));

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId: targetMemberId },
      select: {
        currentBalanceMinutes: true,
        weekStartDate: true,
      },
    });

    // Get settings
    const settings = await prisma.screenTimeSettings.findUnique({
      where: { memberId: targetMemberId },
      select: {
        weeklyAllocationMinutes: true,
      },
    });

    return NextResponse.json({
      summary: {
        totalMinutes,
        totalHours: Math.floor(totalMinutes / 60),
        averagePerDay: dailyTrend.length > 0 ? Math.round(totalMinutes / dailyTrend.length) : 0,
        currentBalance: balance?.currentBalanceMinutes || 0,
        weeklyAllocation: settings?.weeklyAllocationMinutes || 0,
      },
      deviceBreakdown: deviceData,
      dailyTrend,
      period,
    });
  } catch (error) {
    console.error('Screen time stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time stats' },
      { status: 500 }
    );
  }
}
