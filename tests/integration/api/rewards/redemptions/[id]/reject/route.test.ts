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
import { POST } from '@/app/api/rewards/redemptions/[id]/reject/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RedemptionStatus, RewardStatus } from '@/lib/enums'

describe('/api/rewards/redemptions/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const redemptionId = 'redemption-1'
    const mockRedemption = {
      id: redemptionId,
      member_id: 'child-1',
      reward_id: 'reward-1',
      status: RedemptionStatus.PENDING,
      reward: {
        id: 'reward-1',
        family_id: 'family-test-123',
        name: 'Test Reward',
        cost_credits: 50,
        quantity: 10,
      },
      member: {
        id: 'child-1',
        name: 'Child One',
      },
      credit_transaction: {
        id: 'tx-1',
        amount: 50,
      },
    }

    const mockCreditBalance = {
      member_id: 'child-1',
      current_balance: 100,
      lifetime_earned: 200,
      lifetime_spent: 50,
    }

    const mockRejectedRedemption = {
      ...mockRedemption,
      status: RedemptionStatus.REJECTED,
      rejected_at: new Date(),
      rejected_by_id: 'parent-1',
      rejection_reason: 'Test reason',
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

      dbMock.rewardRedemption.findUnique.mockResolvedValue(null)

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

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: 'different-family',
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

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: session.user.familyId,
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

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: session.user.familyId,
        },
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.familyMember.findUnique.mockResolvedValue({ id: 'parent-1' } as any)

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({
        ...mockCreditBalance,
        current_balance: 150,
      } as any)
      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.rewardRedemption.update.mockResolvedValue(mockRejectedRedemption as any)
      dbMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redemption).toEqual(mockRejectedRedemption)
      expect(data.message).toBe('Redemption rejected successfully')

      expect(dbMock.rewardRedemption.update).toHaveBeenCalled()
      expect(dbMock.creditBalance.update).toHaveBeenCalled()
      expect(dbMock.creditTransaction.create).toHaveBeenCalled()
      
      expect(dbMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockRedemption.member_id,
          type: 'REWARD_REJECTED',
          title: 'Reward declined',
          message: expect.stringContaining('was not approved'),
          actionUrl: '/dashboard/rewards',
          metadata: {
            redemptionId,
            rewardName: mockRedemption.reward.name,
            creditsRefunded: mockRedemption.reward.cost_credits,
            rejectionReason: 'Test reason',
            rejectedBy: session.user.name,
          },
        },
      })
    })

    it('should use default reason if not provided', async () => {
      const session = mockParentSession()

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: session.user.familyId,
        },
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.familyMember.findUnique.mockResolvedValue({ id: 'parent-1' } as any)

      // Mock individual updates
      dbMock.rewardRedemption.update.mockResolvedValue({
        ...mockRejectedRedemption,
        rejection_reason: 'No reason provided',
      } as any)
      dbMock.creditBalance.update.mockResolvedValue({} as any)
      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(dbMock.notification.create).toHaveBeenCalledWith(
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

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: session.user.familyId,
        },
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.familyMember.findUnique.mockResolvedValue({ id: 'parent-1' } as any)

      dbMock.rewardRedemption.update.mockResolvedValue(mockRejectedRedemption as any)
      dbMock.creditBalance.update.mockResolvedValue({} as any)
      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.rewardItem.update.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/rewards/redemptions/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: redemptionId }) })

      expect(response.status).toBe(200)

      expect(dbMock.rewardItem.update).toHaveBeenCalledWith({
        where: { id: mockRedemption.reward.id },
        data: {
          quantity: 11,
          status: 'ACTIVE',
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      dbMock.rewardRedemption.findUnique.mockResolvedValue({
        ...mockRedemption,
        reward: {
          ...mockRedemption.reward,
          family_id: session.user.familyId,
        },
      } as any)
      dbMock.rewardRedemption.update.mockRejectedValue(new Error('Database error'))

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
