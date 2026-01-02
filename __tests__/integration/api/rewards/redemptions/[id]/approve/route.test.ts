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
import { POST } from '@/app/api/rewards/redemptions/[id]/approve/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RedemptionStatus, RewardStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/rewards/redemptions/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const redemptionId = 'redemption-1'
    const mockRedemption = {
      id: redemptionId,
      memberId: 'child-1',
      rewardId: 'reward-1',
      status: RedemptionStatus.PENDING,
      reward: {
        id: 'reward-1',
        familyId: 'family-1',
        name: 'Test Reward',
        costCredits: 50,
      },
      member: {
        id: 'child-1',
        name: 'Child One',
      },
    }

    const mockApprovedRedemption = {
      ...mockRedemption,
      status: RedemptionStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: 'parent-1',
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if redemption not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Redemption not found')
    })

    it('should return 403 if redemption belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: 'different-family',
        },
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 if redemption already processed', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
        status: RedemptionStatus.APPROVED,
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This redemption has already been processed')
    })

    it('should approve redemption successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.rewardRedemption.update.mockResolvedValue(mockApprovedRedemption as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redemption).toEqual(mockApprovedRedemption)
      expect(data.message).toContain('Approved')

      expect(prismaMock.rewardRedemption.update).toHaveBeenCalledWith({
        where: { id: redemptionId },
        data: {
          status: 'APPROVED',
          approvedAt: expect.any(Date),
          approvedById: session.user.id,
        },
        include: {
          reward: true,
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockRedemption.memberId,
          type: 'REWARD_APPROVED',
          title: 'Reward approved!',
          message: `Your reward "${mockRedemption.reward.name}" has been approved!`,
          actionUrl: '/dashboard/rewards/redemptions',
          metadata: {
            redemptionId,
            rewardName: mockRedemption.reward.name,
            approvedBy: session.user.name,
          },
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.rewardRedemption.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: { id: redemptionId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to approve redemption')
    })
  })
})
