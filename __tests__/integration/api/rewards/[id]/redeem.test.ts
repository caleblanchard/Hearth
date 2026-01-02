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

// Mock budget-tracker
jest.mock('@/lib/budget-tracker', () => ({
  getCurrentPeriodKey: jest.fn(),
  checkBudgetStatus: jest.fn(),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rewards/[id]/redeem/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RewardStatus, RedemptionStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')
const { checkBudgetStatus } = require('@/lib/budget-tracker')

describe('/api/rewards/[id]/redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const rewardId = 'reward-1'
    const mockReward = {
      id: rewardId,
      familyId: 'family-1',
      name: 'Test Reward',
      costCredits: 50,
      quantity: 10,
      status: RewardStatus.ACTIVE,
    }

    const mockCreditBalance = {
      memberId: 'child-1',
      currentBalance: 100,
      lifetimeEarned: 200,
      lifetimeSpent: 100,
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if reward not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Reward not found')
    })

    it('should return 403 if reward belongs to different family', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: 'family-2', // Different family
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 if reward is not active', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
        status: RewardStatus.INACTIVE,
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This reward is not currently available')
    })

    it('should return 400 if insufficient credits', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        ...mockCreditBalance,
        currentBalance: 20, // Less than cost
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Insufficient credits')
    })

    it('should return 400 if reward is out of stock', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
        quantity: 0,
      } as any)

      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This reward is out of stock')
    })

    it('should successfully redeem reward with sufficient credits', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      prismaMock.budget.findMany.mockResolvedValue([])

      // Mock transaction
      const mockTransaction = {
        creditBalance: {
          update: jest.fn().mockResolvedValue({
            ...mockCreditBalance,
            currentBalance: 50,
            lifetimeSpent: 150,
          }),
        },
        creditTransaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-1',
            memberId: session.user.id,
            type: 'REWARD_REDEMPTION',
            amount: -50,
            balanceAfter: 50,
          }),
        },
        rewardRedemption: {
          create: jest.fn().mockResolvedValue({
            id: 'redemption-1',
            rewardId,
            memberId: session.user.id,
            status: RedemptionStatus.PENDING,
            reward: mockReward,
            member: { id: session.user.id, name: session.user.name },
          }),
        },
        rewardItem: {
          update: jest.fn().mockResolvedValue({
            ...mockReward,
            quantity: 9,
            status: RewardStatus.ACTIVE,
          }),
        },
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction)
      })

      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
      ] as any)

      prismaMock.notification.createMany.mockResolvedValue({ count: 1 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newBalance).toBe(50)
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(mockTransaction.creditBalance.update).toHaveBeenCalledWith({
        where: { memberId: session.user.id },
        data: {
          currentBalance: 50,
          lifetimeSpent: { increment: 50 },
        },
      })
    })

    it('should handle budget warnings', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)

      const mockBudget = {
        id: 'budget-1',
        memberId: session.user.id,
        category: 'REWARDS',
        period: 'monthly',
        limitAmount: 100,
        periods: [],
      }

      prismaMock.budget.findMany.mockResolvedValue([mockBudget] as any)
      ;(checkBudgetStatus as jest.Mock).mockReturnValue({
        status: 'warning',
        percentageUsed: 75,
        budgetLimit: 100,
        currentSpent: 50,
        projectedSpent: 100,
      })

      // Mock transaction
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          creditBalance: { update: jest.fn().mockResolvedValue({ currentBalance: 50 }) },
          creditTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          rewardRedemption: {
            create: jest.fn().mockResolvedValue({
              id: 'redemption-1',
              reward: mockReward,
              member: { id: session.user.id, name: session.user.name },
            }),
          },
          rewardItem: { update: jest.fn().mockResolvedValue(mockReward) },
        })
      })

      prismaMock.familyMember.findMany.mockResolvedValue([])
      prismaMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.budgetWarning).toBeDefined()
      expect(data.budgetWarning.message).toContain('budget')
    })

    it('should handle notification creation failures gracefully', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      prismaMock.budget.findMany.mockResolvedValue([])

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          creditBalance: { update: jest.fn().mockResolvedValue({ currentBalance: 50 }) },
          creditTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          rewardRedemption: {
            create: jest.fn().mockResolvedValue({
              id: 'redemption-1',
              reward: mockReward,
              member: { id: session.user.id, name: session.user.name },
            }),
          },
          rewardItem: { update: jest.fn().mockResolvedValue(mockReward) },
        })
      })

      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
      ] as any)

      // Simulate notification failure
      prismaMock.notification.createMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      // Should still succeed even if notifications fail
      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: { id: rewardId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should update reward quantity when redeemed', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      prismaMock.budget.findMany.mockResolvedValue([])

      const mockTransaction = {
        creditBalance: { update: jest.fn().mockResolvedValue({ currentBalance: 50 }) },
        creditTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
        rewardRedemption: {
          create: jest.fn().mockResolvedValue({
            id: 'redemption-1',
            reward: mockReward,
            member: { id: session.user.id, name: session.user.name },
          }),
        },
        rewardItem: {
          update: jest.fn().mockResolvedValue({
            ...mockReward,
            quantity: 9,
          }),
        },
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction)
      })

      prismaMock.familyMember.findMany.mockResolvedValue([])
      prismaMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      await POST(request, { params: { id: rewardId } })

      expect(mockTransaction.rewardItem.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          quantity: { decrement: 1 },
          status: RewardStatus.ACTIVE,
        },
      })
    })

    it('should mark reward as out of stock when quantity reaches zero', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
        quantity: 1, // Last one
      } as any)

      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      prismaMock.budget.findMany.mockResolvedValue([])

      const mockTransaction = {
        creditBalance: { update: jest.fn().mockResolvedValue({ currentBalance: 50 }) },
        creditTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
        rewardRedemption: {
          create: jest.fn().mockResolvedValue({
            id: 'redemption-1',
            reward: { ...mockReward, quantity: 1 },
            member: { id: session.user.id, name: session.user.name },
          }),
        },
        rewardItem: {
          update: jest.fn().mockResolvedValue({
            ...mockReward,
            quantity: 0,
            status: RewardStatus.OUT_OF_STOCK,
          }),
        },
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction)
      })

      prismaMock.familyMember.findMany.mockResolvedValue([])
      prismaMock.notification.createMany.mockResolvedValue({ count: 0 } as any)

      const request = new NextRequest('http://localhost/api/rewards/123/redeem', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      await POST(request, { params: { id: rewardId } })

      expect(mockTransaction.rewardItem.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          quantity: { decrement: 1 },
          status: RewardStatus.OUT_OF_STOCK, // Should be OUT_OF_STOCK when quantity becomes 0
        },
      })
    })
  })
})
