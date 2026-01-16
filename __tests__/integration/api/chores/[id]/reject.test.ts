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
import { POST } from '@/app/api/chores/[id]/reject/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/app/generated/prisma'

describe('/api/chores/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const choreInstanceId = 'chore-instance-1'
    const mockChoreInstance = {
      id: choreInstanceId,
      assignedToId: 'child-1',
      status: ChoreStatus.COMPLETED,
      notes: 'Original notes',
      choreSchedule: {
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
        },
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if chore instance not found', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should return 400 if chore is not completed', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.PENDING,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Chore must be completed before rejection')
    })

    it('should reject chore with reason', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: 'Not done well',
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('rejected')
      expect(prismaMock.choreInstance.update).toHaveBeenCalledWith({
        where: { id: choreInstanceId },
        data: {
          status: ChoreStatus.REJECTED,
          approvedById: session.user.id,
          approvedAt: expect.any(Date),
          notes: 'Not done well',
        },
      })
    })

    it('should use existing notes if reason not provided', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(prismaMock.choreInstance.update).toHaveBeenCalledWith({
        where: { id: choreInstanceId },
        data: expect.objectContaining({
          notes: 'Original notes',
        }),
      })
    })

    it('should create notification for child with reason', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Needs more effort' }),
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'child-1',
          type: 'CHORE_REJECTED',
          title: 'Chore needs work',
          message: expect.stringContaining('Needs more effort'),
        }),
      })
    })

    it('should create audit log', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)
      prismaMock.choreInstance.update.mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not good enough' }),
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'CHORE_REJECTED',
          entityType: 'ChoreInstance',
          entityId: choreInstanceId,
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            choreName: 'Test Chore',
            reason: 'Not good enough',
          }),
        }),
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()

      prismaMock.choreInstance.findUnique.mockResolvedValue(mockChoreInstance as any)

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reject chore')
    })
  })
})
