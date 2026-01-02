// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

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
import { GET } from '@/app/api/rewards/redemptions/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RedemptionStatus, RewardStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/rewards/redemptions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockRedemptions = [
      {
        id: 'redemption-1',
        memberId: 'child-1',
        rewardId: 'reward-1',
        status: RedemptionStatus.PENDING,
        requestedAt: new Date('2024-01-01'),
        reward: {
          id: 'reward-1',
          name: 'Test Reward',
          costCredits: 50,
          status: RewardStatus.ACTIVE,
        },
        member: {
          id: 'child-1',
          name: 'Child One',
          avatarUrl: null,
        },
      },
    ]

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return pending redemptions for parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findMany.mockResolvedValue(mockRedemptions as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.redemptions).toEqual(mockRedemptions)

      expect(prismaMock.rewardRedemption.findMany).toHaveBeenCalledWith({
        where: {
          reward: {
            familyId: session.user.familyId,
          },
          status: 'PENDING',
        },
        include: {
          reward: true,
          member: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch redemptions')
    })
  })
})
