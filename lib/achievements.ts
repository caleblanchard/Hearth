/**
 * Achievement System
 * Handles achievement definitions, progress tracking, and awards
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from './supabase/server';
import { onChoreStreak } from './rules-engine/hooks';

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  category: 'CHORES' | 'CREDITS' | 'STREAKS' | 'SOCIAL' | 'SPECIAL';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  iconName: string;
  requirement: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Chore Achievements
  {
    key: 'first_chore',
    name: 'Getting Started',
    description: 'Complete your first chore',
    category: 'CHORES',
    tier: 'BRONZE',
    iconName: 'star',
    requirement: 1,
  },
  {
    key: 'chores_10',
    name: 'Helper',
    description: 'Complete 10 chores',
    category: 'CHORES',
    tier: 'BRONZE',
    iconName: 'check-circle',
    requirement: 10,
  },
  {
    key: 'chores_50',
    name: 'Hard Worker',
    description: 'Complete 50 chores',
    category: 'CHORES',
    tier: 'SILVER',
    iconName: 'check-circle',
    requirement: 50,
  },
  {
    key: 'chores_100',
    name: 'Chore Master',
    description: 'Complete 100 chores',
    category: 'CHORES',
    tier: 'GOLD',
    iconName: 'trophy',
    requirement: 100,
  },
  {
    key: 'chores_500',
    name: 'Legend',
    description: 'Complete 500 chores',
    category: 'CHORES',
    tier: 'PLATINUM',
    iconName: 'trophy',
    requirement: 500,
  },

  // Credit Achievements
  {
    key: 'credits_100',
    name: 'First Hundred',
    description: 'Earn 100 credits',
    category: 'CREDITS',
    tier: 'BRONZE',
    iconName: 'currency-dollar',
    requirement: 100,
  },
  {
    key: 'credits_500',
    name: 'Credit Collector',
    description: 'Earn 500 credits',
    category: 'CREDITS',
    tier: 'SILVER',
    iconName: 'currency-dollar',
    requirement: 500,
  },
  {
    key: 'credits_1000',
    name: 'Wealthy',
    description: 'Earn 1,000 credits',
    category: 'CREDITS',
    tier: 'GOLD',
    iconName: 'banknotes',
    requirement: 1000,
  },
  {
    key: 'credits_5000',
    name: 'Credit Tycoon',
    description: 'Earn 5,000 credits',
    category: 'CREDITS',
    tier: 'PLATINUM',
    iconName: 'banknotes',
    requirement: 5000,
  },

  // Streak Achievements
  {
    key: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete chores 7 days in a row',
    category: 'STREAKS',
    tier: 'BRONZE',
    iconName: 'fire',
    requirement: 7,
  },
  {
    key: 'streak_30',
    name: 'Month Master',
    description: 'Complete chores 30 days in a row',
    category: 'STREAKS',
    tier: 'SILVER',
    iconName: 'fire',
    requirement: 30,
  },
  {
    key: 'streak_100',
    name: 'Unstoppable',
    description: 'Complete chores 100 days in a row',
    category: 'STREAKS',
    tier: 'GOLD',
    iconName: 'fire',
    requirement: 100,
  },

  // Special Achievements
  {
    key: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all assigned chores in a week',
    category: 'SPECIAL',
    tier: 'GOLD',
    iconName: 'sparkles',
    requirement: 1,
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 chores before noon',
    category: 'SPECIAL',
    tier: 'SILVER',
    iconName: 'sun',
    requirement: 10,
  },
  {
    key: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 10 chores after 8 PM',
    category: 'SPECIAL',
    tier: 'SILVER',
    iconName: 'moon',
    requirement: 10,
  },
];

// Initialize achievements in database
export async function initializeAchievements() {
  const supabase = await createClient();
  
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const { data: existing } = await supabase
      .from('achievements')
      .select('id')
      .eq('key', def.key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('achievements')
        .update({
          name: def.name,
          description: def.description,
          category: def.category,
          tier: def.tier,
          icon_name: def.iconName,
          requirement: def.requirement,
        })
        .eq('key', def.key);
    } else {
      await supabase
        .from('achievements')
        .insert({
          key: def.key,
          name: def.name,
          description: def.description,
          category: def.category,
          tier: def.tier,
          icon_name: def.iconName,
          requirement: def.requirement,
        });
    }
  }
}

// Check and award achievement
export async function checkAndAwardAchievement(
  userId: string,
  achievementKey: string,
  currentProgress: number
) {
  const supabase = await createClient();
  
  const { data: achievement } = await supabase
    .from('achievements')
    .select('*')
    .eq('key', achievementKey)
    .single();

  if (!achievement) return null;

  const { data: userAchievement } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id)
    .maybeSingle();

  const isCompleted = currentProgress >= achievement.requirement;
  const completedAt = isCompleted ? new Date().toISOString() : null;

  if (!userAchievement) {
    const { data: newUserAchievement } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        progress: currentProgress,
        is_completed: isCompleted,
        completed_at: completedAt,
      })
      .select(`
        *,
        achievement:achievements(*)
      `)
      .single();
    
    // Create notification if just completed
    if (isCompleted) {
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', userId)
        .single();

      if (member) {
        await supabase
          .from('notifications')
          .insert({
            family_id: member.family_id,
            recipient_id: userId,
            type: 'GENERAL',
            title: '🏆 Achievement Unlocked!',
            message: `You earned the "${achievement.name}" badge! ${achievement.description}`,
            action_url: '/dashboard/profile',
            metadata: {
              achievementKey: achievement.key,
              achievementName: achievement.name,
              tier: achievement.tier,
            },
          });
      }
    }
    
    return newUserAchievement;
  } else if (!userAchievement.is_completed && isCompleted) {
    const { data: updated } = await supabase
      .from('user_achievements')
      .update({
        progress: currentProgress,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', userAchievement.id)
      .select(`
        *,
        achievement:achievements(*)
      `)
      .single();
    
    // Create notification for newly completed achievement
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', userId)
      .single();

    if (member) {
      await supabase
        .from('notifications')
        .insert({
          family_id: member.family_id,
          recipient_id: userId,
          type: 'GENERAL',
          title: '🏆 Achievement Unlocked!',
          message: `You earned the "${achievement.name}" badge! ${achievement.description}`,
          action_url: '/dashboard/profile',
          metadata: {
            achievementKey: achievement.key,
            achievementName: achievement.name,
            tier: achievement.tier,
          },
        });
    }
    
    return updated;
  }

  return null;
}

// Update streak
export async function updateStreak(
  userId: string,
  type: 'DAILY_CHORES' | 'WEEKLY_CHORES' | 'PERFECT_WEEK' | 'REWARD_SAVER',
  familyId?: string
) {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle();

  if (!streak) {
    const { data: newStreak } = await supabase
      .from('streaks')
      .insert({
        user_id: userId,
        type,
        current_count: 1,
        longest_count: 1,
        last_activity_date: today.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    // Trigger rules engine hook for streak update
    if (familyId && type === 'DAILY_CHORES' && newStreak) {
      try {
        await onChoreStreak(userId, familyId, {
          currentStreak: newStreak.current_count,
          longestStreak: newStreak.longest_count,
        });
      } catch (error) {
        console.error('Rules engine streak hook error:', error);
      }
    }

    return newStreak;
  } else {
    const lastDate = streak.last_activity_date ? new Date(streak.last_activity_date) : null;
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no update needed
        return streak;
      } else if (daysDiff === 1) {
        // Consecutive day
        const newCount = streak.current_count + 1;
        const { data: updated } = await supabase
          .from('streaks')
          .update({
            current_count: newCount,
            longest_count: Math.max(newCount, streak.longest_count),
            last_activity_date: today.toISOString(),
          })
          .eq('id', streak.id)
          .select()
          .single();

        // Check streak achievements
        if (type === 'DAILY_CHORES') {
          if (newCount >= 7) await checkAndAwardAchievement(userId, 'streak_7', newCount);
          if (newCount >= 30) await checkAndAwardAchievement(userId, 'streak_30', newCount);
          if (newCount >= 100) await checkAndAwardAchievement(userId, 'streak_100', newCount);
        }

        // Trigger rules engine hook for streak update
        if (familyId && type === 'DAILY_CHORES' && updated) {
          try {
            await onChoreStreak(userId, familyId, {
              currentStreak: newCount,
              longestStreak: updated.longest_count,
            });
          } catch (error) {
            console.error('Rules engine streak hook error:', error);
          }
        }

        return updated;
      } else {
        // Streak broken
        const { data: updated } = await supabase
          .from('streaks')
          .update({
            current_count: 1,
            last_activity_date: today.toISOString(),
          })
          .eq('id', streak.id)
          .select()
          .single();

        // Trigger rules engine hook for streak reset
        if (familyId && type === 'DAILY_CHORES' && updated) {
          try {
            await onChoreStreak(userId, familyId, {
              currentStreak: 1,
              longestStreak: updated.longest_count,
            });
          } catch (error) {
            console.error('Rules engine streak hook error:', error);
          }
        }

        return updated;
      }
    }
  }

  return streak;
}
