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
import { POST } from '@/app/api/rewards/redemptions/[id]/reject/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RedemptionStatus, RewardStatus } from '@/app/generated/prisma'

describe('/api/rewards/redemptions/[id]/reject', () => {
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
        quantity: 10,
      },
      member: {
        id: 'child-1',
        name: 'Child One',
      },
      creditTransaction: {
        id: 'tx-1',
        amount: 50,
      },
    }

    const mockCreditBalance = {
      memberId: 'child-1',
      currentBalance: 100,
      lifetimeEarned: 200,
      lifetimeSpent: 50,
    }

    const mockRejectedRedemption = {
      ...mockRedemption,
      status: RedemptionStatus.REJECTED,
      rejectedAt: new Date(),
      rejectedById: 'parent-1',
      rejectionReason: 'Test reason',
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if redemption not found', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Redemption not found')
    })

    it('should return 403 if redemption belongs to different family', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: 'different-family',
        },
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 if redemption already processed', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
        status: RedemptionStatus.APPROVED,
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This redemption has already been processed')
    })

    it('should reject redemption and refund credits successfully', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      // Mock transaction
      const mockTransaction = jest.fn(async (callback: any) => {
        return await callback({
          rewardRedemption: {
            update: jest.fn().mockResolvedValue(mockRejectedRedemption as any),
          },
          creditBalance: {
            findUnique: jest.fn().mockResolvedValue(mockCreditBalance as any),
            update: jest.fn().mockResolvedValue({
              ...mockCreditBalance,
              currentBalance: 150,
            } as any),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({} as any),
          },
          rewardItem: {
            update: jest.fn().mockResolvedValue({} as any),
          },
        })
      })
      prismaMock.$transaction = mockTransaction as any
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redemption).toEqual(mockRejectedRedemption)
      expect(data.message).toContain('Rejected')
      expect(data.message).toContain('Credits have been refunded')

      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockRedemption.memberId,
          type: 'REWARD_REJECTED',
          title: 'Reward declined',
          message: expect.stringContaining('was not approved'),
          actionUrl: '/dashboard/rewards',
          metadata: {
            redemptionId,
            rewardName: mockRedemption.reward.name,
            creditsRefunded: mockRedemption.reward.costCredits,
            rejectionReason: 'Test reason',
            rejectedBy: session.user.name,
          },
        },
      })
    })

    it('should use default reason if not provided', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const mockTransaction = jest.fn(async (callback: any) => {
        return await callback({
          rewardRedemption: {
            update: jest.fn().mockResolvedValue({
              ...mockRejectedRedemption,
              rejectionReason: 'No reason provided',
            } as any),
          },
          creditBalance: {
            findUnique: jest.fn().mockResolvedValue(mockCreditBalance as any),
            update: jest.fn().mockResolvedValue({} as any),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({} as any),
          },
          rewardItem: {
            update: jest.fn().mockResolvedValue({} as any),
          },
        })
      })
      prismaMock.$transaction = mockTransaction as any
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              rejectionReason: 'No reason provided',
            }),
          }),
        })
      )
    })

    it('should restore quantity if reward has quantity', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const mockTransaction = jest.fn(async (callback: any) => {
        const tx = {
          rewardRedemption: {
            update: jest.fn().mockResolvedValue(mockRejectedRedemption as any),
          },
          creditBalance: {
            findUnique: jest.fn().mockResolvedValue(mockCreditBalance as any),
            update: jest.fn().mockResolvedValue({} as any),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({} as any),
          },
          rewardItem: {
            update: jest.fn().mockResolvedValue({} as any),
          },
        }
        const result = await callback(tx)
        expect(tx.rewardItem.update).toHaveBeenCalledWith({
          where: { id: mockRedemption.reward.id },
          data: {
            quantity: {
              increment: 1,
            },
            status: 'ACTIVE',
          },
        })
        return result
      })
      prismaMock.$transaction = mockTransaction as any
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })

      expect(response.status).toBe(200)
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          familyId: session.user.familyId,
        },
      } as any)
      prismaMock.$transaction.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reject redemption')
    })
  })
})
