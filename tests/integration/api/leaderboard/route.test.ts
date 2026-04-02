// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

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
import { Role } from '@/lib/enums'

describe('/api/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
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

      const mockLeaderboard = [
        {
          id: 'entry-1',
          user_id: 'child-1',
          rank: 1,
          score: 100,
          period: 'WEEKLY',
          streak: 7,
          user: { id: 'child-1', name: 'Child One', avatar_url: null }
        },
        {
          id: 'entry-2',
          user_id: 'child-2',
          rank: 2,
          score: 60,
          period: 'WEEKLY',
          streak: 3,
          user: { id: 'child-2', name: 'Child Two', avatar_url: null }
        }
      ]

      dbMock.leaderboardEntry.findMany.mockResolvedValue(mockLeaderboard as any)

      const request = new NextRequest('http://localhost/api/leaderboard?period=weekly')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('WEEKLY')
      expect(data.leaderboard).toHaveLength(2)
      expect(data.leaderboard[0].rank).toBe(1)
      expect(data.leaderboard[0].score).toBe(100)
      expect(data.leaderboard[1].rank).toBe(2)
      expect(data.leaderboard[1].score).toBe(60)
    })

    it('should return leaderboard for all-time period', async () => {
      const session = mockParentSession()

      const mockLeaderboard = [
        {
          id: 'entry-1',
          user_id: 'child-1',
          rank: 1,
          score: 200,
          period: 'ALL_TIME',
          streak: 5,
          user: { id: 'child-1', name: 'Child One', avatar_url: null }
        },
        {
          id: 'entry-2',
          user_id: 'child-2',
          rank: 2,
          score: 150,
          period: 'ALL_TIME',
          streak: 2,
          user: { id: 'child-2', name: 'Child Two', avatar_url: null }
        }
      ]

      dbMock.leaderboardEntry.findMany.mockResolvedValue(mockLeaderboard as any)

      const request = new NextRequest('http://localhost/api/leaderboard?period=all-time')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('ALL_TIME')
      expect(data.leaderboard[0].score).toBe(200)
      expect(data.leaderboard[1].score).toBe(150)
    })

    it('should handle members without streaks', async () => {
      const session = mockParentSession()

      const mockLeaderboard = [
        {
          id: 'entry-1',
          user_id: 'child-1',
          rank: 1,
          score: 0,
          period: 'WEEKLY',
          streak: 0,
          user: { id: 'child-1', name: 'Child One', avatar_url: null }
        }
      ]

      dbMock.leaderboardEntry.findMany.mockResolvedValue(mockLeaderboard as any)

      const request = new NextRequest('http://localhost/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leaderboard[0].streak).toBe(0)
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      dbMock.leaderboardEntry.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch leaderboard')
    })
  })
})
