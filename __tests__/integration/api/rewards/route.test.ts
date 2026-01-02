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
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/rewards/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RewardStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/rewards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockRewards = [
      {
        id: 'reward-1',
        familyId: 'family-1',
        name: 'Test Reward',
        description: 'A test reward',
        category: 'OTHER',
        costCredits: 50,
        quantity: 10,
        status: RewardStatus.ACTIVE,
        createdBy: {
          id: 'parent-1',
          name: 'Parent One',
        },
        _count: {
          redemptions: 2,
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

    it('should return active rewards for authenticated user', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findMany.mockResolvedValue(mockRewards as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rewards).toEqual(mockRewards)

      expect(prismaMock.rewardItem.findMany).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          status: 'ACTIVE',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              redemptions: {
                where: {
                  status: {
                    in: ['PENDING', 'APPROVED'],
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { costCredits: 'asc' },
          { name: 'asc' },
        ],
      })
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch rewards')
    })
  })

  describe('POST', () => {
    const mockReward = {
      id: 'reward-1',
      familyId: 'family-1',
      name: 'New Reward',
      description: 'A new reward',
      category: 'OTHER',
      costCredits: 100,
      quantity: 5,
      status: RewardStatus.ACTIVE,
      createdById: 'parent-1',
      createdBy: {
        id: 'parent-1',
        name: 'Parent One',
      },
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 if name is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if name is empty', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: '   ',
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if costCredits is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          costCredits: -10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid cost in credits is required')
    })

    it('should create reward successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.create.mockResolvedValue(mockReward as any)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          description: 'A new reward',
          category: 'OTHER',
          costCredits: 100,
          quantity: 5,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reward).toEqual(mockReward)
      expect(data.message).toBe('Reward created successfully')

      expect(prismaMock.rewardItem.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'New Reward',
          description: 'A new reward',
          category: 'OTHER',
          costCredits: 100,
          quantity: 5,
          imageUrl: null,
          status: 'ACTIVE',
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should use default values for optional fields', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.create.mockResolvedValue(mockReward as any)

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      expect(prismaMock.rewardItem.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'New Reward',
          description: null,
          category: 'OTHER',
          costCredits: 100,
          quantity: null,
          imageUrl: null,
          status: 'ACTIVE',
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Reward',
          costCredits: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create reward')
    })
  })
})
