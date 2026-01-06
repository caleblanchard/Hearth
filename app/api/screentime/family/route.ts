import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateRemainingTime } from '@/lib/screentime-utils';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Get all family members with their screen time data
    const members = await prisma.familyMember.findMany({
      where: {
        familyId: session.user.familyId,
        isActive: true,
        role: { not: 'PARENT' }, // Only show children
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });

    // Get screen time data for each member
    const membersWithData = await Promise.all(
      members.map(async (member) => {
        const [balance, settings, recentUsage, allowances] = await Promise.all([
          prisma.screenTimeBalance.findUnique({
            where: { memberId: member.id },
          }),
          prisma.screenTimeSettings.findUnique({
            where: { memberId: member.id },
          }),
          prisma.screenTimeTransaction.findMany({
            where: {
              memberId: member.id,
              type: 'SPENT',
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
            select: {
              amountMinutes: true,
            },
          }),
          prisma.screenTimeAllowance.findMany({
            where: { memberId: member.id },
            include: {
              screenTimeType: {
                select: {
                  id: true,
                  name: true,
                  isActive: true,
                },
              },
            },
          }),
        ]);

        const weeklyUsage = recentUsage.reduce(
          (sum, t) => sum + Math.abs(t.amountMinutes),
          0
        );

        // Calculate remaining time for each allowance and total remaining
        const allowancesWithRemaining = await Promise.all(
          allowances.map(async (a) => {
            try {
              const remaining = await calculateRemainingTime(member.id, a.screenTimeTypeId);
              return {
                id: a.id,
                screenTimeTypeId: a.screenTimeTypeId,
                screenTimeTypeName: a.screenTimeType.name,
                allowanceMinutes: a.allowanceMinutes,
                period: a.period,
                remainingMinutes: remaining.remainingMinutes,
              };
            } catch (error) {
              logger.warn('Failed to calculate remaining time for allowance', {
                error: error instanceof Error ? error.message : String(error),
                allowanceId: a.id,
                memberId: member.id,
              });
              return {
                id: a.id,
                screenTimeTypeId: a.screenTimeTypeId,
                screenTimeTypeName: a.screenTimeType.name,
                allowanceMinutes: a.allowanceMinutes,
                period: a.period,
                remainingMinutes: a.allowanceMinutes, // Fallback to full allowance if calculation fails
              };
            }
          })
        );

        // Calculate total remaining time from all allowances
        const totalRemaining = allowancesWithRemaining.reduce(
          (sum, a) => sum + a.remainingMinutes,
          0
        );

        // Calculate total weekly allocation from all allowances (for weekly allowances)
        const totalWeeklyAllocation = allowancesWithRemaining
          .filter((a) => a.period === 'WEEKLY')
          .reduce((sum, a) => sum + a.allowanceMinutes, 0);

        // Use total remaining from allowances if available, otherwise fall back to general balance
        const currentBalance = allowancesWithRemaining.length > 0 
          ? totalRemaining 
          : (balance?.currentBalanceMinutes || 0);

        // Use total weekly allocation from allowances if available, otherwise fall back to general allocation
        const weeklyAllocation = allowancesWithRemaining.length > 0
          ? totalWeeklyAllocation
          : (settings?.weeklyAllocationMinutes || 0);

        return {
          ...member,
          currentBalance,
          weeklyAllocation,
          weeklyUsage,
          weekStartDate: balance?.weekStartDate,
          allowances: allowancesWithRemaining,
        };
      })
    );

    return NextResponse.json({ members: membersWithData });
  } catch (error) {
    logger.error('Family screen time error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family screen time' },
      { status: 500 }
    );
  }
}
