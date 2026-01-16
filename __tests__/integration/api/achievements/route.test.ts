// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/achievements/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/achievements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return achievements for authenticated user', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        {
          id: 'ach-1',
          key: 'first_chore',
          name: 'Getting Started',
          category: 'CHORES',
          tier: 'BRONZE',
          requirement: 1,
        },
      ]

      const mockUserAchievements = [
        {
          id: 'ua-1',
          userId: 'child-1',
          achievementId: 'ach-1',
          progress: 1,
          isCompleted: true,
          completedAt: new Date(),
          achievement: mockAchievements[0],
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue(mockUserAchievements as any)
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(1)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        lifetimeEarned: 0,
      } as any)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements).toBeDefined()
      expect(data.stats).toBeDefined()
      expect(data.streaks).toBeDefined()
      expect(prismaMock.achievement.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: expect.any(Array),
      })
    })

    it('should calculate progress for CHORES category', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        {
          id: 'ach-1',
          key: 'chores_10',
          category: 'CHORES',
          requirement: 10,
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue([])
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(5) // 5 chores completed
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        lifetimeEarned: 0,
      } as any)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements[0].progress).toBe(5)
      expect(data.achievements[0].percentage).toBe(50) // 5/10 = 50%
    })

    it('should calculate progress for CREDITS category', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        {
          id: 'ach-2',
          key: 'credits_100',
          category: 'CREDITS',
          requirement: 100,
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue([])
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(0)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        lifetimeEarned: 75,
      } as any)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements[0].progress).toBe(75)
      expect(data.achievements[0].percentage).toBe(75) // 75/100 = 75%
    })

    it('should calculate progress for STREAKS category', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        {
          id: 'ach-3',
          key: 'streak_7',
          category: 'STREAKS',
          requirement: 7,
        },
      ]

      const mockStreaks = [
        {
          userId: 'child-1',
          type: 'DAILY_CHORES',
          longestCount: 5,
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue([])
      prismaMock.streak.findMany.mockResolvedValue(mockStreaks as any)
      prismaMock.choreInstance.count.mockResolvedValue(0)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        lifetimeEarned: 0,
      } as any)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements[0].progress).toBe(5)
    })

    it('should allow parent to view child achievements', async () => {
      const session = mockParentSession()

      prismaMock.achievement.findMany.mockResolvedValue([])
      prismaMock.userAchievement.findMany.mockResolvedValue([])
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(0)
      prismaMock.creditBalance.findUnique.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/achievements?userId=child-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismaMock.userAchievement.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
        include: { achievement: true },
      })
    })

    it('should return 403 if child tries to view another child achievements', async () => {
      const session = mockChildSession()

      const request = new NextRequest(
        'http://localhost/api/achievements?userId=child-2'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should calculate completion statistics', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        { id: 'ach-1', requirement: 1 },
        { id: 'ach-2', requirement: 10 },
        { id: 'ach-3', requirement: 50 },
      ]

      const mockUserAchievements = [
        {
          achievementId: 'ach-1',
          isCompleted: true,
        },
        {
          achievementId: 'ach-2',
          isCompleted: true,
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue(mockUserAchievements as any)
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(0)
      prismaMock.creditBalance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stats.total).toBe(3)
      expect(data.stats.completed).toBe(2)
      expect(data.stats.percentage).toBe(67) // 2/3 = 67%
    })

    it('should cap percentage at 100', async () => {
      const session = mockChildSession()

      const mockAchievements = [
        {
          id: 'ach-1',
          category: 'CHORES',
          requirement: 10,
        },
      ]

      prismaMock.achievement.findMany.mockResolvedValue(mockAchievements as any)
      prismaMock.userAchievement.findMany.mockResolvedValue([])
      prismaMock.streak.findMany.mockResolvedValue([])
      prismaMock.choreInstance.count.mockResolvedValue(15) // More than requirement
      prismaMock.creditBalance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements[0].percentage).toBe(100) // Capped at 100%
    })
  })
})
