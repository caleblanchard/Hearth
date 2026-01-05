import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Parents can view any child's achievements
    if (userId !== session.user.id && session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all achievements with user progress
    const [achievements, userAchievements, streaks] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { tier: 'asc' }, { requirement: 'asc' }],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
      }),
      prisma.streak.findMany({
        where: { userId },
      }),
    ]);

    // Get user stats for progress calculation
    const [choresCompleted, creditsEarned] = await Promise.all([
      prisma.choreInstance.count({
        where: {
          assignedToId: userId,
          status: 'APPROVED',
        },
      }),
      prisma.creditBalance.findUnique({
        where: { memberId: userId },
        select: { lifetimeEarned: true },
      }),
    ]);

    const achievementsWithProgress = achievements.map((achievement) => {
      const userProgress = userAchievements.find((ua) => ua.achievementId === achievement.id);

      // Calculate current progress based on achievement type
      let currentProgress = userProgress?.progress || 0;
      if (!userProgress || !userProgress.isCompleted) {
        if (achievement.category === 'CHORES') {
          currentProgress = choresCompleted;
        } else if (achievement.category === 'CREDITS') {
          currentProgress = creditsEarned?.lifetimeEarned || 0;
        } else if (achievement.category === 'STREAKS') {
          const dailyStreak = streaks.find((s) => s.type === 'DAILY_CHORES');
          currentProgress = dailyStreak?.longestCount || 0;
        }
      }

      return {
        ...achievement,
        progress: currentProgress,
        isCompleted: userProgress?.isCompleted || false,
        completedAt: userProgress?.completedAt,
        percentage: Math.min(100, Math.round((currentProgress / achievement.requirement) * 100)),
      };
    });

    const completedCount = achievementsWithProgress.filter((a) => a.isCompleted).length;

    return NextResponse.json({
      achievements: achievementsWithProgress,
      stats: {
        total: achievements.length,
        completed: completedCount,
        percentage: Math.round((completedCount / achievements.length) * 100),
      },
      streaks,
    });
  } catch (error) {
    logger.error('Fetch achievements error:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}
