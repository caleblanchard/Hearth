import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
        const [balance, settings, recentUsage] = await Promise.all([
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
        ]);

        const weeklyUsage = recentUsage.reduce(
          (sum, t) => sum + Math.abs(t.amountMinutes),
          0
        );

        return {
          ...member,
          currentBalance: balance?.currentBalanceMinutes || 0,
          weeklyAllocation: settings?.weeklyAllocationMinutes || 0,
          weeklyUsage,
          weekStartDate: balance?.weekStartDate,
        };
      })
    );

    return NextResponse.json({ members: membersWithData });
  } catch (error) {
    console.error('Family screen time error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family screen time' },
      { status: 500 }
    );
  }
}
