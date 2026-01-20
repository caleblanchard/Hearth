import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getAchievements, getUserAchievements } from '@/lib/data/achievements';
import { logger } from '@/lib/logger';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const targetMemberId =
      searchParams.get('userId') || searchParams.get('memberId') || memberId;

    // Parents can view any child's achievements
    if (targetMemberId !== memberId) {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const effectiveMemberId = targetMemberId;

    // Get all achievements with user progress
    const achievements = useMockDb
      ? await (dbMock as any).achievement.findMany({
          where: { isActive: true },
          orderBy: [{ category: 'asc' }, { tier: 'asc' }, { requirement: 'asc' }],
        })
      : await getAchievements(familyId);
    const userAchievements = useMockDb
      ? await (dbMock as any).userAchievement.findMany({
          where: { userId: effectiveMemberId },
          include: { achievement: true },
        })
      : await getUserAchievements(targetMemberId);

    // Get user stats for progress calculation (simplified - would need proper data module functions)
    const choresCount = useMockDb
      ? await (dbMock as any).choreInstance.count({
          where: { assignedToId: effectiveMemberId, status: 'COMPLETED' },
        })
      : (
          await (supabase as any)
            .from('chore_completions')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', targetMemberId)
            .eq('status', 'APPROVED')
        ).count;

    const creditBalance = useMockDb
      ? await (dbMock as any).creditBalance.findUnique({
          where: { memberId: effectiveMemberId },
        })
      : (
          await (supabase as any)
            .from('credit_balances')
            .select('lifetime_earned')
            .eq('member_id', targetMemberId)
            .single()
        ).data;

    const choresCompleted = choresCount || 0;
    const creditsEarned = creditBalance?.lifetime_earned ?? creditBalance?.lifetimeEarned ?? 0;

    const streaks = useMockDb
      ? await (dbMock as any).streak.findMany({ where: { userId: effectiveMemberId } })
      : [];

    const achievementsWithProgress = achievements.map((achievement: any) => {
      const userProgress = userAchievements.find(
        (ua: any) =>
          ua.achievement_id === achievement.id || ua.achievementId === achievement.id
      );

      // Calculate current progress based on achievement type
      let currentProgress = userProgress?.progress || 0;
      const isCompleted =
        userProgress?.is_completed ?? userProgress?.isCompleted ?? false;
      if (!userProgress || !isCompleted) {
        if (achievement.category === 'CHORES') {
          currentProgress = choresCompleted;
        } else if (achievement.category === 'CREDITS') {
          currentProgress = creditsEarned;
        } else if (achievement.category === 'STREAKS') {
          const streak = streaks.find((s: any) => s.type === 'DAILY_CHORES');
          currentProgress = streak?.longestCount ?? 0;
        }
      }

      return {
        ...achievement,
        progress: currentProgress,
        isCompleted,
        completedAt: userProgress?.completed_at ?? userProgress?.completedAt,
        percentage: Math.min(
          100,
          Math.round((currentProgress / achievement.requirement) * 100)
        ),
      };
    });

    const completedCount = achievementsWithProgress.filter((a: any) => a.isCompleted).length;

    const totalCount = achievements.length;
    const percentage = totalCount
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

    return NextResponse.json({
      achievements: achievementsWithProgress,
      stats: {
        completed: completedCount,
        total: totalCount,
        percentage,
      },
      streaks,
    });
  } catch (error) {
    logger.error('Fetch achievements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
