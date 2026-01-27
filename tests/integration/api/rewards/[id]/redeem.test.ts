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

// Mock budget-tracker
jest.mock('@/lib/budget-tracker', () => ({
  getCurrentPeriodKey: jest.fn(),
  checkBudgetStatus: jest.fn(),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rewards/[id]/redeem/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RewardStatus, RedemptionStatus } from '@/lib/enums'

const { checkBudgetStatus } = require('@/lib/budget-tracker')

describe('/api/rewards/[id]/redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const rewardId = 'reward-1'
    const mockReward = {
      id: rewardId,
      family_id: 'family-1',
      name: 'Test Reward',
      cost_credits: 50,
      quantity: 10,
      status: RewardStatus.ACTIVE,
    }

    const mockCreditBalance = {
      member_id: 'child-1',
      current_balance: 100,
      lifetime_earned: 200,
      lifetime_spent: 100,
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if reward not found', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Reward not found')
    })

    it('should return 403 if reward belongs to different family', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: 'family-2', // Different family
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 if reward is not active', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
        status: RewardStatus.INACTIVE,
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This reward is not currently available')
    })

    it('should return 400 if insufficient credits', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue({
        ...mockCreditBalance,
        current_balance: 20, // Less than cost
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Insufficient credits')
    })

    it('should return 400 if reward is out of stock', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
        quantity: 0,
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This reward is out of stock')
    })

    it('should successfully redeem reward with sufficient credits', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.budget.findMany.mockResolvedValue([])

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({
        ...mockCreditBalance,
        current_balance: 50,
        lifetime_spent: 150,
      } as any)
      dbMock.creditTransaction.create.mockResolvedValue({
        id: 'tx-1',
        member_id: session.user.id,
        type: 'REWARD_REDEMPTION',
        amount: -50,
        balance_after: 50,
      } as any)
      dbMock.rewardItem.update.mockResolvedValue({
        ...mockReward,
        quantity: 9,
        status: RewardStatus.ACTIVE,
      } as any)
      dbMock.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        reward_id: rewardId,
        member_id: session.user.id,
        status: RedemptionStatus.PENDING,
        reward: mockReward,
        member: { id: session.user.id, name: session.user.name },
      } as any)

      dbMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
      ] as any)

      dbMock.notification.createMany.mockResolvedValue({ count: 1 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // data.redemption contains the result.
      expect(dbMock.creditBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            memberId: session.user.id,
            currentBalance: 100 
          },
          data: expect.objectContaining({
            currentBalance: 50,
          }),
        })
      )
    })

    it('should handle budget warnings', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const mockBudget = {
        id: 'budget-1',
        member_id: session.user.id,
        category: 'REWARDS',
        period: 'monthly',
        limit_amount: 100,
        periods: [],
      }

      dbMock.budget.findMany.mockResolvedValue([mockBudget] as any)
      ;(checkBudgetStatus as jest.Mock).mockReturnValue({
        status: 'warning',
        percentageUsed: 75,
        budgetLimit: 100,
        currentSpent: 50,
        projectedSpent: 100,
      })

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({ current_balance: 50 } as any)
      dbMock.creditTransaction.create.mockResolvedValue({ id: 'tx-1' } as any)
      dbMock.rewardItem.update.mockResolvedValue(mockReward as any)
      dbMock.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        reward: mockReward,
        member: { id: session.user.id, name: session.user.name },
      } as any)

      dbMock.familyMember.findMany.mockResolvedValue([])
      dbMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.budgetWarning).toBeDefined()
      expect(data.budgetWarning.message).toContain('budget')
    })

    it('should handle notification creation failures gracefully', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.budget.findMany.mockResolvedValue([])

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({ current_balance: 50 } as any)
      dbMock.creditTransaction.create.mockResolvedValue({ id: 'tx-1' } as any)
      dbMock.rewardItem.update.mockResolvedValue(mockReward as any)
      dbMock.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        reward: mockReward,
        member: { id: session.user.id, name: session.user.name },
      } as any)

      dbMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
      ] as any)

      // Simulate notification failure
      dbMock.notification.createMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      // Should still succeed even if notifications fail
      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should update reward quantity when redeemed', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
      } as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.budget.findMany.mockResolvedValue([])

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({ current_balance: 50 } as any)
      dbMock.creditTransaction.create.mockResolvedValue({ id: 'tx-1' } as any)
      dbMock.rewardItem.update.mockResolvedValue({
        ...mockReward,
        quantity: 9,
      } as any)
      dbMock.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        reward: mockReward,
        member: { id: session.user.id, name: session.user.name },
      } as any)

      dbMock.familyMember.findMany.mockResolvedValue([])
      dbMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      await POST(request, { params: Promise.resolve({ id: rewardId }) })

      expect(dbMock.rewardItem.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          quantity: 9,
          status: RewardStatus.ACTIVE,
        },
      })
    })

    it('should mark reward as out of stock when quantity reaches zero', async () => {
      const session = mockChildSession()

      dbMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        family_id: session.user.familyId,
        quantity: 1, // Last one
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.budget.findMany.mockResolvedValue([])

      // Mock individual updates
      dbMock.creditBalance.update.mockResolvedValue({ current_balance: 50 } as any)
      dbMock.creditTransaction.create.mockResolvedValue({ id: 'tx-1' } as any)
      dbMock.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        reward: { ...mockReward, quantity: 1 },
        member: { id: session.user.id, name: session.user.name },
      } as any)
      dbMock.rewardItem.update.mockResolvedValue({
        ...mockReward,
        quantity: 0,
        status: RewardStatus.OUT_OF_STOCK,
      } as any)

      dbMock.familyMember.findMany.mockResolvedValue([])
      dbMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      await POST(request, { params: Promise.resolve({ id: rewardId }) })

      expect(dbMock.rewardItem.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          quantity: 0,
          status: RewardStatus.OUT_OF_STOCK, // Should be OUT_OF_STOCK when quantity becomes 0
        },
      })
    })
  })
})
