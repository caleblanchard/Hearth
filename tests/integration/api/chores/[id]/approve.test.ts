// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// Mock achievements
jest.mock('@/lib/achievements', () => ({
  checkAndAwardAchievement: jest.fn(),
  updateStreak: jest.fn(),
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
import { POST } from '@/app/api/chores/[id]/approve/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

const { checkAndAwardAchievement, updateStreak } = require('@/lib/achievements')

describe('/api/chores/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const choreInstanceId = 'chore-instance-1'
    const mockChoreInstance = {
      id: choreInstanceId,
      assignedToId: 'child-1',
      status: ChoreStatus.COMPLETED,
      choreSchedule: {
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
          creditValue: 10,
        },
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if chore instance not found', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should return 400 if chore is not completed', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.PENDING,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Chore must be completed before approval')
    })

    it('should approve chore and award credits', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: session.user.id,
        creditsAwarded: 10,
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 50,
        lifetimeEarned: 100,
        lifetimeSpent: 50,
      } as any)

      dbMock.creditBalance.update.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 60,
        lifetimeEarned: 110,
        lifetimeSpent: 50,
      } as any)

      dbMock.creditTransaction.create.mockResolvedValue({
        id: 'tx-1',
        memberId: 'child-1',
        type: 'CHORE_REWARD',
        amount: 10,
        balanceAfter: 60,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(5)
      ;(checkAndAwardAchievement as jest.Mock).mockResolvedValue(undefined)
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('approved')
      expect(dbMock.choreInstance.update).toHaveBeenCalledWith({
        where: { id: choreInstanceId },
        data: {
          status: ChoreStatus.APPROVED,
          approvedAt: expect.any(Date),
          approvedById: session.user.id,
          creditsAwarded: 10,
        },
      })
      expect(dbMock.creditBalance.update).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        data: {
          currentBalance: { increment: 10 },
          lifetimeEarned: { increment: 10 },
        },
      })
    })

    it('should create credit balance if it does not exist', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue(null)
      dbMock.creditBalance.create.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 10,
        lifetimeEarned: 10,
        lifetimeSpent: 0,
      } as any)

      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(1)
      ;(checkAndAwardAchievement as jest.Mock).mockResolvedValue(undefined)
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(dbMock.creditBalance.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-1',
          currentBalance: 10,
          lifetimeEarned: 10,
          lifetimeSpent: 0,
        },
      })
    })

    it('should not award credits if creditValue is 0', async () => {
      const session = mockParentSession()

      const choreWithNoCredits = {
        ...mockChoreInstance,
        choreSchedule: {
          choreDefinition: {
            id: 'chore-def-1',
            name: 'Test Chore',
            creditValue: 0,
          },
        },
      }

      dbMock.choreInstance.findUnique.mockResolvedValue(choreWithNoCredits as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...choreWithNoCredits,
        status: ChoreStatus.APPROVED,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(1)
      ;(checkAndAwardAchievement as jest.Mock).mockResolvedValue(undefined)
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      // creditBalance.findUnique is called for achievements even when creditValue is 0
      // So we only check that creditTransaction.create is not called
      expect(dbMock.creditTransaction.create).not.toHaveBeenCalled()
    })

    it('should create notification for child', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 50,
      } as any)

      dbMock.creditBalance.update.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 60,
      } as any)

      dbMock.creditTransaction.create.mockResolvedValue({
        id: 'tx-1',
        balanceAfter: 60,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(1)
      ;(checkAndAwardAchievement as jest.Mock).mockResolvedValue(undefined)
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(dbMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'child-1',
          type: 'CHORE_APPROVED',
          title: 'Chore approved!',
          message: expect.stringContaining('approved'),
        }),
      })
    })

    it('should check achievements and update streaks', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
      } as any)

      dbMock.creditBalance.findUnique
        .mockResolvedValueOnce({
          memberId: 'child-1',
          currentBalance: 50,
        } as any)
        .mockResolvedValueOnce({
          memberId: 'child-1',
          lifetimeEarned: 100,
        } as any)

      dbMock.creditBalance.update.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 60,
      } as any)

      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(5)
      ;(checkAndAwardAchievement as jest.Mock).mockResolvedValue(undefined)
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(checkAndAwardAchievement).toHaveBeenCalledTimes(9) // 5 chore achievements + 4 credit achievements
      expect(updateStreak).toHaveBeenCalledWith('child-1', 'DAILY_CHORES', session.user.familyId)
    })

    it('should handle achievement check failures gracefully', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      dbMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
      } as any)

      dbMock.creditBalance.findUnique.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 50,
      } as any)

      dbMock.creditBalance.update.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 60,
      } as any)

      dbMock.creditTransaction.create.mockResolvedValue({} as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.notification.create.mockResolvedValue({} as any)
      dbMock.choreInstance.count.mockResolvedValue(1)
      ;(checkAndAwardAchievement as jest.Mock).mockRejectedValue(new Error('Achievement error'))
      ;(updateStreak as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      // Should still succeed even if achievement check fails
      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
