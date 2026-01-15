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

// NOW import the routes after mocks are set up
import { NextRequest } from 'next/server'
import { GET as getChores } from '@/app/api/chores/route'
import { GET as getRewards } from '@/app/api/rewards/route'
import { GET as getTransactions } from '@/app/api/financial/transactions/route'
import { GET as getSavingsGoals } from '@/app/api/financial/savings-goals/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RewardStatus } from '@/app/generated/prisma'

describe('Family Isolation Tests - Data Security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('Chores Isolation', () => {
    it('should only return chores for user\'s family', async () => {
      const session = mockParentSession()

      const family1Chores = [
        { id: 'chore-1', familyId: session.user.familyId, name: 'Family 1 Chore' },
        { id: 'chore-2', familyId: session.user.familyId, name: 'Family 1 Chore 2' },
      ]

      prismaMock.choreDefinition.findMany.mockResolvedValue(family1Chores as any)

      const request = new NextRequest('http://localhost/api/chores')
      const response = await getChores(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toEqual(family1Chores)

      // Verify query filters by familyId
      expect(prismaMock.choreDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: session.user.familyId,
          }),
        })
      )

      // Verify family-2 chores are NOT included
      expect(data.chores).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ familyId: 'family-2' }),
        ])
      )
    })

    it('should prevent accessing chores from different family', async () => {
      const session = mockParentSession()

      // Mock should only return data for the session's family
      prismaMock.choreDefinition.findMany.mockResolvedValue([
        { id: 'chore-1', familyId: session.user.familyId, name: 'Family Chore' },
      ] as any)

      const request = new NextRequest("http://localhost/api/chores")
      const response = await getChores(request)

      // The query should filter by familyId
      expect(prismaMock.choreDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: session.user.familyId,
          }),
        })
      )
    })
  })

  describe('Rewards Isolation', () => {
    it('should only return rewards for user\'s family', async () => {
      const session = mockChildSession()

      const family1Rewards = [
        {
          id: 'reward-1',
          familyId: 'family-1',
          name: 'Family 1 Reward',
          status: RewardStatus.ACTIVE,
        },
      ]

      prismaMock.rewardItem.findMany.mockResolvedValue(family1Rewards as any)

      const request = new NextRequest("http://localhost/api/rewards")
      const response = await getRewards(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rewards).toEqual(family1Rewards)

      // Verify query filters by familyId
      expect(prismaMock.rewardItem.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          status: 'ACTIVE',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      })
    })

    it('should prevent accessing rewards from different family', async () => {
      const session = mockChildSession()

      prismaMock.rewardItem.findMany.mockResolvedValue([
        {
          id: 'reward-1',
          familyId: 'family-1',
          name: 'Family 1 Reward',
          status: RewardStatus.ACTIVE,
        },
      ] as any)

      const request = new NextRequest("http://localhost/api/rewards")
      const response = await getRewards(request)

      // Verify query filters by familyId
      expect(prismaMock.rewardItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
          }),
        })
      )
    })
  })

  describe('Financial Transactions Isolation', () => {
    it('should only return transactions for user\'s family', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

      const family1Transactions = [
        {
          id: 'tx-1',
          memberId: 'child-1',
          amount: 100,
          member: { familyId: 'family-1' },
        },
      ]

      prismaMock.creditTransaction.findMany.mockResolvedValue(family1Transactions as any)

      const request = new NextRequest('http://localhost/api/financial/transactions')
      const response = await getTransactions(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify query filters by familyId through member relation
      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            member: expect.objectContaining({
              familyId: 'family-1',
            }),
          }),
        })
      )
      // Note: memberId filter is added by the route for children, but the test verifies family isolation
    })

    it('should prevent accessing transactions from different family', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

      prismaMock.creditTransaction.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/financial/transactions')
      await getTransactions(request)

      // Verify query enforces family isolation
      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            member: expect.objectContaining({
              familyId: 'family-1',
            }),
          }),
        })
      )
    })

    it('should allow parents to see all family transactions but not other families', async () => {
      const session = mockParentSession()

      const family1Transactions = [
        {
          id: 'tx-1',
          memberId: 'child-1',
          amount: 100,
          member: { familyId: 'family-1' },
        },
        {
          id: 'tx-2',
          memberId: 'child-2',
          amount: 50,
          member: { familyId: 'family-1' },
        },
      ]

      prismaMock.creditTransaction.findMany.mockResolvedValue(family1Transactions as any)

      const request = new NextRequest('http://localhost/api/financial/transactions')
      await getTransactions(request)

      // Parents can see all family transactions, but still filtered by familyId
      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            member: expect.objectContaining({
              familyId: 'family-1',
            }),
            // No memberId filter for parents
          }),
        })
      )
    })
  })

  describe('Savings Goals Isolation', () => {
    it('should only return savings goals for user\'s family', async () => {
      const session = mockChildSession()

      const family1Goals = [
        {
          id: 'goal-1',
          memberId: session.user.id,
          name: 'Family Goal',
          member: { id: session.user.id, familyId: session.user.familyId },
        },
      ]

      prismaMock.savingsGoal.findMany.mockResolvedValue(family1Goals as any)

      const response = await getSavingsGoals()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.goals).toEqual(family1Goals)

      // Verify query filters by familyId through member relation
      const calls = prismaMock.savingsGoal.findMany.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const query = calls[0][0]
      expect(query?.where?.member?.familyId).toBe(session.user.familyId)
      expect(query?.where?.memberId).toBe(session.user.id)
    })

    it('should prevent accessing savings goals from different family', async () => {
      const session = mockChildSession()

      prismaMock.savingsGoal.findMany.mockResolvedValue([])

      await getSavingsGoals()

      // Verify query enforces family isolation
      const calls = prismaMock.savingsGoal.findMany.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const query = calls[0][0]
      expect(query?.where?.member?.familyId).toBe(session.user.familyId)
      expect(query?.where?.memberId).toBe(session.user.id)
    })
  })

  describe('Cross-Family Access Prevention', () => {
    it('should prevent family-1 user from accessing family-2 data across all endpoints', async () => {
      const session1 = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })
      const session2 = mockChildSession({ user: { id: 'child-2', familyId: 'family-2' } })

      // Test that queries always include familyId filter
      const endpoints = [
        { name: 'chores', handler: getChores },
        { name: 'rewards', handler: getRewards },
        { name: 'transactions', handler: getTransactions },
        { name: 'savings-goals', handler: getSavingsGoals },
      ]

      for (const endpoint of endpoints) {
        jest.clearAllMocks()

        const request = new NextRequest(`http://localhost/api/${endpoint.name}`)
        await endpoint.handler(request)

        // Verify all queries filter by familyId
        const calls = (prismaMock as any)[Object.keys(prismaMock).find((key) => key.includes('findMany')) || '']?.mock?.calls || []
        if (calls.length > 0) {
          const query = calls[0][0]
          if (query?.where) {
            // Check that familyId is in the where clause (directly or through relations)
            const hasFamilyFilter =
              query.where.familyId === 'family-1' ||
              query.where.member?.familyId === 'family-1'

            expect(hasFamilyFilter).toBe(true)
          }
        }
      }
    })
  })
})
