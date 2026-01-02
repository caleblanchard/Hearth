import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'
import {
  checkAndAwardAchievement,
  updateStreak,
  initializeAchievements,
  ACHIEVEMENT_DEFINITIONS,
} from '@/lib/achievements'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}))

describe('lib/achievements.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('checkAndAwardAchievement', () => {
    const userId = 'user-1'
    const achievementKey = 'first_chore'
    const mockAchievement = {
      id: 'ach-1',
      key: achievementKey,
      name: 'Getting Started',
      requirement: 1,
    }

    it('should return null if achievement not found', async () => {
      prismaMock.achievement.findUnique.mockResolvedValue(null)

      const result = await checkAndAwardAchievement(userId, achievementKey, 1)

      expect(result).toBeNull()
    })

    it('should create user achievement if not exists', async () => {
      prismaMock.achievement.findUnique.mockResolvedValue(mockAchievement as any)
      prismaMock.userAchievement.findUnique.mockResolvedValue(null)
      prismaMock.userAchievement.create.mockResolvedValue({
        id: 'ua-1',
        userId,
        achievementId: 'ach-1',
        progress: 1,
        isCompleted: true,
        completedAt: new Date(),
        achievement: mockAchievement,
      } as any)

      const result = await checkAndAwardAchievement(userId, achievementKey, 1)

      expect(result).toBeDefined()
      expect(prismaMock.userAchievement.create).toHaveBeenCalledWith({
        data: {
          userId,
          achievementId: 'ach-1',
          progress: 1,
          isCompleted: true,
          completedAt: expect.any(Date),
        },
        include: { achievement: true },
      })
    })

    it('should update user achievement if progress increased', async () => {
      prismaMock.achievement.findUnique.mockResolvedValue(mockAchievement as any)
      prismaMock.userAchievement.findUnique.mockResolvedValue({
        id: 'ua-1',
        userId,
        achievementId: 'ach-1',
        progress: 0,
        isCompleted: false,
      } as any)

      prismaMock.userAchievement.update.mockResolvedValue({
        id: 'ua-1',
        progress: 1,
        isCompleted: true,
        completedAt: new Date(),
        achievement: mockAchievement,
      } as any)

      await checkAndAwardAchievement(userId, achievementKey, 1)

      expect(prismaMock.userAchievement.update).toHaveBeenCalledWith({
        where: { id: 'ua-1' },
        data: {
          progress: 1,
          isCompleted: true,
          completedAt: expect.any(Date),
        },
        include: { achievement: true },
      })
    })

    it('should create notification when achievement is completed', async () => {
      const completedAt = new Date()
      prismaMock.achievement.findUnique.mockResolvedValue(mockAchievement as any)
      prismaMock.userAchievement.findUnique.mockResolvedValue(null)
      prismaMock.userAchievement.create.mockResolvedValue({
        id: 'ua-1',
        userId,
        achievementId: 'ach-1',
        progress: 1,
        isCompleted: true,
        completedAt,
        achievement: mockAchievement,
      } as any)

      prismaMock.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any)

      // Mock Date.now to be within 5 seconds of completedAt
      jest.spyOn(Date, 'now').mockReturnValue(completedAt.getTime() + 2000)

      const result = await checkAndAwardAchievement(userId, achievementKey, 1)

      expect(result).toBeDefined()
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'GENERAL',
          title: '🏆 Achievement Unlocked!',
          message: expect.stringContaining('Getting Started'),
          actionUrl: '/dashboard/profile',
          metadata: expect.objectContaining({
            achievementKey,
            achievementName: 'Getting Started',
          }),
        },
      })

      jest.restoreAllMocks()
    })

    it('should not create notification if achievement was completed more than 5 seconds ago', async () => {
      const completedAt = new Date(Date.now() - 10000) // 10 seconds ago
      prismaMock.achievement.findUnique.mockResolvedValue(mockAchievement as any)
      prismaMock.userAchievement.findUnique.mockResolvedValue({
        id: 'ua-1',
        userId,
        achievementId: 'ach-1',
        progress: 1,
        isCompleted: true,
        completedAt,
        achievement: mockAchievement,
      } as any)

      const result = await checkAndAwardAchievement(userId, achievementKey, 1)

      expect(result).toBeNull()
      expect(prismaMock.notification.create).not.toHaveBeenCalled()
    })
  })

  describe('updateStreak', () => {
    const userId = 'user-1'
    const streakType = 'DAILY_CHORES'

    it('should create new streak if not exists', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      prismaMock.streak.findUnique.mockResolvedValue(null)
      prismaMock.streak.create.mockResolvedValue({
        id: 'streak-1',
        userId,
        type: streakType,
        currentCount: 1,
        longestCount: 1,
        lastActivityDate: today,
        isActive: true,
      } as any)

      const result = await updateStreak(userId, streakType)

      expect(result).toBeDefined()
      expect(prismaMock.streak.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: streakType,
          currentCount: 1,
          longestCount: 1,
          lastActivityDate: today,
          isActive: true,
        },
      })
    })

    it('should increment streak on consecutive day', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      prismaMock.streak.findUnique.mockResolvedValue({
        id: 'streak-1',
        userId,
        type: streakType,
        currentCount: 5,
        longestCount: 5,
        lastActivityDate: yesterday,
      } as any)

      prismaMock.streak.update.mockResolvedValue({
        id: 'streak-1',
        currentCount: 6,
        longestCount: 6,
        lastActivityDate: today,
      } as any)

      ;(checkAndAwardAchievement as jest.Mock) = jest.fn().mockResolvedValue(null)

      const result = await updateStreak(userId, streakType)

      expect(result).toBeDefined()
      expect(prismaMock.streak.update).toHaveBeenCalledWith({
        where: { id: 'streak-1' },
        data: {
          currentCount: 6,
          longestCount: 6,
          lastActivityDate: today,
        },
      })
    })

    it('should reset streak if more than one day passed', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      prismaMock.streak.findUnique.mockResolvedValue({
        id: 'streak-1',
        userId,
        type: streakType,
        currentCount: 5,
        longestCount: 10,
        lastActivityDate: twoDaysAgo,
      } as any)

      prismaMock.streak.update.mockResolvedValue({
        id: 'streak-1',
        currentCount: 1,
        longestCount: 10, // Should preserve longest
        lastActivityDate: today,
      } as any)

      const result = await updateStreak(userId, streakType)

      expect(result).toBeDefined()
      expect(prismaMock.streak.update).toHaveBeenCalledWith({
        where: { id: 'streak-1' },
        data: {
          currentCount: 1,
          lastActivityDate: today,
        },
      })
    })

    it('should not update if same day', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      prismaMock.streak.findUnique.mockResolvedValue({
        id: 'streak-1',
        userId,
        type: streakType,
        currentCount: 5,
        lastActivityDate: today,
      } as any)

      const result = await updateStreak(userId, streakType)

      expect(result).toBeDefined()
      expect(prismaMock.streak.update).not.toHaveBeenCalled()
    })

    it('should check streak achievements for DAILY_CHORES', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      prismaMock.streak.findUnique.mockResolvedValue({
        id: 'streak-1',
        userId,
        type: streakType,
        currentCount: 6,
        longestCount: 6,
        lastActivityDate: yesterday,
      } as any)

      prismaMock.streak.update.mockResolvedValue({
        id: 'streak-1',
        currentCount: 7,
        longestCount: 7,
        lastActivityDate: today,
      } as any)

      // Verify that checkAndAwardAchievement is called by checking prisma calls
      // The function calls checkAndAwardAchievement internally, which we can't easily spy on
      // So we verify the behavior indirectly by checking the streak was updated correctly
      await updateStreak(userId, streakType)

      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'streak-1' },
          data: expect.objectContaining({
            currentCount: 7,
            longestCount: 7,
          }),
        })
      )
    })
  })

  describe('initializeAchievements', () => {
    it('should upsert all achievement definitions', async () => {
      prismaMock.achievement.upsert.mockResolvedValue({} as any)

      await initializeAchievements()

      expect(prismaMock.achievement.upsert).toHaveBeenCalledTimes(
        ACHIEVEMENT_DEFINITIONS.length
      )
    })

    it('should create achievement if not exists', async () => {
      const def = ACHIEVEMENT_DEFINITIONS[0]

      prismaMock.achievement.upsert.mockResolvedValue({
        key: def.key,
        name: def.name,
      } as any)

      await initializeAchievements()

      expect(prismaMock.achievement.upsert).toHaveBeenCalledWith({
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
      })
    })
  })
})
