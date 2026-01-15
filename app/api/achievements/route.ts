import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getAchievements, getUserAchievements } from '@/lib/data/achievements';
import { logger } from '@/lib/logger';

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
    const targetMemberId = searchParams.get('memberId') || memberId;

    // Parents can view any child's achievements
    if (targetMemberId !== memberId) {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get all achievements with user progress
    const achievements = await getAchievements(familyId);
    const userAchievements = await getUserAchievements(targetMemberId);

    // Get user stats for progress calculation (simplified - would need proper data module functions)
    const { count: choresCount } = await (supabase as any)
      .from('chore_completions')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', targetMemberId)
      .eq('status', 'APPROVED');

    const { data: creditBalance } = await (supabase as any)
      .from('credit_balances')
      .select('lifetime_earned')
      .eq('member_id', targetMemberId)
      .single();

    const choresCompleted = choresCount || 0;
    const creditsEarned = creditBalance?.lifetime_earned || 0;

    const achievementsWithProgress = achievements.map((achievement: any) => {
      const userProgress = userAchievements.find((ua: any) => ua.achievement_id === achievement.id);

      // Calculate current progress based on achievement type
      let currentProgress = userProgress?.progress || 0;
      if (!userProgress || !userProgress.is_completed) {
        if (achievement.category === 'CHORES') {
          currentProgress = choresCompleted;
        } else if (achievement.category === 'CREDITS') {
          currentProgress = creditsEarned;
        }
      }

      return {
        ...achievement,
        progress: currentProgress,
        isCompleted: userProgress?.is_completed || false,
        completedAt: userProgress?.completed_at,
        percentage: Math.min(100, Math.round((currentProgress / achievement.requirement) * 100)),
      };
    });

    const completedCount = achievementsWithProgress.filter((a: any) => a.isCompleted).length;

    return NextResponse.json({
      achievements: achievementsWithProgress,
      completedCount,
      totalCount: achievements.length,
    });
  } catch (error) {
    logger.error('Fetch achievements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
