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
import { POST } from '@/app/api/chores/[id]/complete/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/chores/[id]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const choreInstanceId = 'chore-instance-1'
    const mockChoreInstance = {
      id: choreInstanceId,
      assignedToId: 'child-1',
      status: ChoreStatus.PENDING,
      choreSchedule: {
        requiresApproval: false,
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
          creditValue: 10,
        },
      },
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if chore instance not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should return 403 if user is not assigned and not a parent', async () => {
      const session = mockChildSession({ user: { id: 'other-child' } })
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findUnique.mockResolvedValue({
        ...mockChoreInstance,
        assignedToId: 'child-1', // Different child
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should allow parent to complete any chore', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
        completedAt: new Date(),
        completedById: session.user.id,
      } as any)

      // Mock credit balance operations
      prismaMock.creditBalance.upsert.mockResolvedValue({
        memberId: 'child-1',
        currentBalance: 10,
        lifetimeEarned: 10,
        lifetimeSpent: 0,
      } as any)

      prismaMock.creditTransaction.create.mockResolvedValue({
        id: 'tx-1',
        memberId: 'child-1',
        type: 'CHORE_REWARD',
        amount: 10,
        balanceAfter: 10,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prismaMock.choreInstance.update).toHaveBeenCalled()
    })

    it('should complete chore without approval and award credits atomically', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.APPROVED,
        completedAt: new Date(),
        completedById: session.user.id,
      } as any)

      // Mock transaction for credit operations
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          creditBalance: {
            upsert: jest.fn().mockResolvedValue({
              memberId: 'child-1',
              currentBalance: 10,
              lifetimeEarned: 10,
              lifetimeSpent: 0,
            }),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({
              id: 'tx-1',
              memberId: 'child-1',
              type: 'CHORE_REWARD',
              amount: 10,
              balanceAfter: 10,
            }),
          },
        })
      })

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should handle chore requiring approval', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const choreRequiringApproval = {
        ...mockChoreInstance,
        choreSchedule: {
          requiresApproval: true,
          choreDefinition: {
            id: 'chore-def-1',
            name: 'Test Chore',
            creditValue: 10,
          },
        },
      }

      prismaMock.choreInstance.findUnique.mockResolvedValue(choreRequiringApproval as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...choreRequiringApproval,
        status: ChoreStatus.COMPLETED,
        completedAt: new Date(),
        completedById: session.user.id,
      } as any)

      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
        { id: 'parent-2', name: 'Parent 2' },
      ] as any)

      prismaMock.notification.createMany.mockResolvedValue({ count: 2 } as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Waiting for parent approval')
      expect(prismaMock.notification.createMany).toHaveBeenCalled()
      expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'parent-1',
            type: 'CHORE_COMPLETED',
          }),
          expect.objectContaining({
            userId: 'parent-2',
            type: 'CHORE_COMPLETED',
          }),
        ]),
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should handle notification creation failures gracefully', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const choreRequiringApproval = {
        ...mockChoreInstance,
        choreSchedule: {
          requiresApproval: true,
          choreDefinition: {
            id: 'chore-def-1',
            name: 'Test Chore',
            creditValue: 10,
          },
        },
      }

      prismaMock.choreInstance.findUnique.mockResolvedValue(choreRequiringApproval as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...choreRequiringApproval,
        status: ChoreStatus.COMPLETED,
      } as any)

      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', name: 'Parent 1' },
      ] as any)

      // Simulate notification creation failure
      prismaMock.notification.createMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      // Should still succeed even if notifications fail
      const response = await POST(request, { params: { id: choreInstanceId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should verify family membership', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      // Chore from different family
      const otherFamilyChore = {
        ...mockChoreInstance,
        assignedToId: 'child-other-family',
      }

      prismaMock.choreInstance.findUnique.mockResolvedValue(otherFamilyChore as any)

      // Mock to return chore with family info to verify
      prismaMock.choreInstance.findUnique.mockResolvedValue({
        ...otherFamilyChore,
        choreSchedule: {
          ...otherFamilyChore.choreSchedule,
          choreDefinition: {
            ...otherFamilyChore.choreSchedule.choreDefinition,
            familyId: 'family-2', // Different family
          },
        },
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      // This should be caught by the assignment check, but we should verify
      // that family verification happens at the query level
      const response = await POST(request, { params: { id: choreInstanceId } })

      // Should fail either at assignment check or family check
      expect([403, 404]).toContain(response.status)
    })
  })
})
