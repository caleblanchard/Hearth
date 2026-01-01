import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly'; // weekly, monthly, all-time

    // Calculate period key
    const now = new Date();
    let periodKey: string;
    if (period === 'weekly') {
      const weekNum = Math.ceil((now.getDate() - now.getDay() + 1) / 7);
      periodKey = `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    } else if (period === 'monthly') {
      periodKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    } else {
      periodKey = 'all-time';
    }

    // Get all children in the family
    const members = await prisma.familyMember.findMany({
      where: {
        familyId: session.user.familyId,
        role: 'CHILD',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Calculate scores for each member
    const leaderboard = await Promise.all(
      members.map(async (member) => {
        let score = 0;

        if (period === 'all-time') {
          // All-time: total credits earned
          const creditBalance = await prisma.creditBalance.findUnique({
            where: { memberId: member.id },
            select: { lifetimeEarned: true },
          });
          score = creditBalance?.lifetimeEarned || 0;
        } else {
          // Weekly/Monthly: chores completed + credits earned in period
          const startDate = new Date(now);
          if (period === 'weekly') {
            startDate.setDate(now.getDate() - now.getDay()); // Start of week
          } else {
            startDate.setDate(1); // Start of month
          }
          startDate.setHours(0, 0, 0, 0);

          const [choresCompleted, creditsEarned] = await Promise.all([
            prisma.choreInstance.count({
              where: {
                assignedToId: member.id,
                status: 'APPROVED',
                completedAt: { gte: startDate },
              },
            }),
            prisma.creditTransaction.aggregate({
              where: {
                memberId: member.id,
                type: 'CHORE_REWARD',
                createdAt: { gte: startDate },
              },
              _sum: { amount: true },
            }),
          ]);

          score = (choresCompleted * 10) + (creditsEarned._sum.amount || 0);
        }

        // Get streak info
        const dailyStreak = await prisma.streak.findUnique({
          where: {
            userId_type: {
              userId: member.id,
              type: 'DAILY_CHORES',
            },
          },
        });

        return {
          userId: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
          score,
          streak: dailyStreak?.currentCount || 0,
        };
      })
    );

    // Sort by score and assign ranks
    leaderboard.sort((a, b) => b.score - a.score);
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Update/create leaderboard entries in database
    await Promise.all(
      rankedLeaderboard.map((entry) =>
        prisma.leaderboardEntry.upsert({
          where: {
            userId_period_periodKey: {
              userId: entry.userId,
              period,
              periodKey,
            },
          },
          update: {
            score: entry.score,
            rank: entry.rank,
          },
          create: {
            userId: entry.userId,
            familyId: session.user.familyId,
            period,
            periodKey,
            score: entry.score,
            rank: entry.rank,
          },
        })
      )
    );

    return NextResponse.json({
      period,
      periodKey,
      leaderboard: rankedLeaderboard,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
