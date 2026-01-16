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
import { GET } from '@/app/api/leaderboard/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { Role } from '@/app/generated/prisma'

describe('/api/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockMembers = [
      {
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
      },
      {
        id: 'child-2',
        name: 'Child Two',
        avatarUrl: null,
      },
    ]

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return leaderboard for weekly period', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.choreInstance.count
        .mockResolvedValueOnce(5) // child-1
        .mockResolvedValueOnce(3) // child-2
      prismaMock.creditTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50 } } as any) // child-1
        .mockResolvedValueOnce({ _sum: { amount: 30 } } as any) // child-2
      prismaMock.streak.findUnique
        .mockResolvedValueOnce({ currentCount: 7 } as any) // child-1
        .mockResolvedValueOnce({ currentCount: 3 } as any) // child-2
      prismaMock.leaderboardEntry.upsert.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/leaderboard?period=weekly')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('weekly')
      expect(data.leaderboard).toHaveLength(2)
      expect(data.leaderboard[0].rank).toBe(1)
      expect(data.leaderboard[0].score).toBe(100) // (5 * 10) + 50
      expect(data.leaderboard[1].rank).toBe(2)
      expect(data.leaderboard[1].score).toBe(60) // (3 * 10) + 30
    })

    it('should return leaderboard for all-time period', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.creditBalance.findUnique
        .mockResolvedValueOnce({ lifetimeEarned: 200 } as any) // child-1
        .mockResolvedValueOnce({ lifetimeEarned: 150 } as any) // child-2
      prismaMock.streak.findUnique
        .mockResolvedValueOnce({ currentCount: 5 } as any)
        .mockResolvedValueOnce({ currentCount: 2 } as any)
      prismaMock.leaderboardEntry.upsert.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/leaderboard?period=all-time')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('all-time')
      expect(data.leaderboard[0].score).toBe(200)
      expect(data.leaderboard[1].score).toBe(150)
    })

    it('should handle members without streaks', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.choreInstance.count.mockResolvedValue(0)
      prismaMock.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } } as any)
      prismaMock.streak.findUnique.mockResolvedValue(null)
      prismaMock.leaderboardEntry.upsert.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leaderboard[0].streak).toBe(0)
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch leaderboard')
    })
  })
})
