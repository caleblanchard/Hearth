import prisma from './prisma';
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
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await prisma.achievement.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
        tier: def.tier,
        iconName: def.iconName,
        requirement: def.requirement,
      },
      create: def,
    });
  }
}

// Check and award achievement
export async function checkAndAwardAchievement(
  userId: string,
  achievementKey: string,
  currentProgress: number
) {
  const achievement = await prisma.achievement.findUnique({
    where: { key: achievementKey },
  });

  if (!achievement) return null;

  let userAchievement = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId: achievement.id,
      },
    },
  });

  if (!userAchievement) {
    userAchievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
        progress: currentProgress,
        isCompleted: currentProgress >= achievement.requirement,
        completedAt: currentProgress >= achievement.requirement ? new Date() : null,
      },
      include: {
        achievement: true,
      },
    });
  } else if (!userAchievement.isCompleted) {
    userAchievement = await prisma.userAchievement.update({
      where: { id: userAchievement.id },
      data: {
        progress: currentProgress,
        isCompleted: currentProgress >= achievement.requirement,
        completedAt: currentProgress >= achievement.requirement ? new Date() : null,
      },
      include: {
        achievement: true,
      },
    });
  }

  // If just completed, create notification
  if (
    userAchievement.isCompleted &&
    userAchievement.completedAt &&
    new Date().getTime() - new Date(userAchievement.completedAt).getTime() < 5000
  ) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'GENERAL',
        title: '🏆 Achievement Unlocked!',
        message: `You earned the "${achievement.name}" badge! ${achievement.description}`,
        actionUrl: '/dashboard/profile',
        metadata: {
          achievementKey: achievement.key,
          achievementName: achievement.name,
          tier: achievement.tier,
        },
      },
    });

    return userAchievement;
  }

  return null;
}

// Update streak
export async function updateStreak(
  userId: string,
  type: 'DAILY_CHORES' | 'WEEKLY_CHORES' | 'PERFECT_WEEK' | 'REWARD_SAVER',
  familyId?: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = await prisma.streak.findUnique({
    where: {
      userId_type: {
        userId,
        type,
      },
    },
  });

  if (!streak) {
    streak = await prisma.streak.create({
      data: {
        userId,
        type,
        currentCount: 1,
        longestCount: 1,
        lastActivityDate: today,
        isActive: true,
      },
    });

    // Trigger rules engine hook for streak update
    if (familyId && type === 'DAILY_CHORES') {
      try {
        await onChoreStreak(userId, familyId, {
          currentStreak: streak.currentCount,
          longestStreak: streak.longestCount,
        });
      } catch (error) {
        console.error('Rules engine streak hook error:', error);
      }
    }
  } else {
    const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no update needed
        return streak;
      } else if (daysDiff === 1) {
        // Consecutive day
        const newCount = streak.currentCount + 1;
        streak = await prisma.streak.update({
          where: { id: streak.id },
          data: {
            currentCount: newCount,
            longestCount: Math.max(newCount, streak.longestCount),
            lastActivityDate: today,
          },
        });

        // Check streak achievements
        if (type === 'DAILY_CHORES') {
          if (newCount >= 7) await checkAndAwardAchievement(userId, 'streak_7', newCount);
          if (newCount >= 30) await checkAndAwardAchievement(userId, 'streak_30', newCount);
          if (newCount >= 100) await checkAndAwardAchievement(userId, 'streak_100', newCount);
        }

        // Trigger rules engine hook for streak update
        if (familyId && type === 'DAILY_CHORES') {
          try {
            await onChoreStreak(userId, familyId, {
              currentStreak: newCount,
              longestStreak: streak.longestCount,
            });
          } catch (error) {
            console.error('Rules engine streak hook error:', error);
          }
        }
      } else {
        // Streak broken
        streak = await prisma.streak.update({
          where: { id: streak.id },
          data: {
            currentCount: 1,
            lastActivityDate: today,
          },
        });

        // Trigger rules engine hook for streak reset
        if (familyId && type === 'DAILY_CHORES') {
          try {
            await onChoreStreak(userId, familyId, {
              currentStreak: 1,
              longestStreak: streak.longestCount,
            });
          } catch (error) {
            console.error('Rules engine streak hook error:', error);
          }
        }
      }
    }
  }

  return streak;
}
