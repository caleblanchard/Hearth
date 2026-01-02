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
import { GET, PATCH, DELETE } from '@/app/api/chores/[id]/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/chores/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const choreId = 'chore-1'
    const mockChore = {
      id: choreId,
      familyId: 'family-1',
      name: 'Test Chore',
      description: 'Test description',
      creditValue: 10,
      difficulty: 'MEDIUM',
      schedules: [],
    }

    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if chore not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should return 403 if chore belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return chore details for parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const mockChoreWithFamily = {
        ...mockChore,
        familyId: session.user.familyId,
      }

      prismaMock.choreDefinition.findUnique.mockResolvedValue(mockChoreWithFamily as any)

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chore).toEqual(mockChoreWithFamily)

      expect(prismaMock.choreDefinition.findUnique).toHaveBeenCalledWith({
        where: { id: choreId },
        include: {
          schedules: {
            include: {
              assignments: {
                include: {
                  member: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
                where: {
                  isActive: true,
                },
                orderBy: {
                  rotationOrder: 'asc',
                },
              },
              _count: {
                select: {
                  instances: true,
                },
              },
            },
            where: {
              isActive: true,
            },
          },
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/123')
      const response = await GET(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch chore')
    })
  })

  describe('PATCH', () => {
    const choreId = 'chore-1'
    const mockChore = {
      id: choreId,
      familyId: 'family-1',
      name: 'Test Chore',
    }

    const mockUpdatedChore = {
      ...mockChore,
      name: 'Updated Chore',
      description: 'Updated description',
      creditValue: 20,
      difficulty: 'HARD',
      schedules: [],
    }

    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Chore' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Chore' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if chore not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Chore' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should return 400 if name is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name must be 1-100 characters')
    })

    it('should return 400 if name is too long', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name must be 1-100 characters')
    })

    it('should return 400 if description is too long', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ description: 'a'.repeat(1001) }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Description must be 1000 characters or less')
    })

    it('should return 400 if creditValue is negative', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ creditValue: -10 }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Credit value must be 0 or greater')
    })

    it('should return 400 if difficulty is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ difficulty: 'INVALID' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Difficulty must be EASY, MEDIUM, or HARD')
    })

    it('should return 400 if estimatedMinutes is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ estimatedMinutes: 0 }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Estimated minutes must be greater than 0')
    })

    it('should update chore successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)
      const mockUpdatedChoreWithSchedules = {
        ...mockUpdatedChore,
        familyId: session.user.familyId,
        schedules: [],
      }
      prismaMock.choreDefinition.update.mockResolvedValue(mockUpdatedChoreWithSchedules as any)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Chore',
          description: 'Updated description',
          creditValue: 20,
          difficulty: 'HARD',
        }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.chore).toMatchObject({
        name: 'Updated Chore',
        description: 'Updated description',
        creditValue: 20,
        difficulty: 'HARD',
      })
      expect(data.message).toBe('Chore updated successfully')
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
      } as any)
      prismaMock.choreDefinition.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Chore' }),
      })

      const response = await PATCH(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update chore')
    })
  })

  describe('DELETE', () => {
    const choreId = 'chore-1'
    const mockChore = {
      id: choreId,
      familyId: 'family-1',
      name: 'Test Chore',
      schedules: [],
    }

    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if chore not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Chore not found')
    })

    it('should soft delete chore and schedules', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
        schedules: [],
      } as any)
      prismaMock.$transaction.mockResolvedValue([
        { id: choreId, isActive: false },
        { count: 2 },
      ])

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Chore deactivated successfully')

      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreDefinition.findUnique.mockResolvedValue({
        ...mockChore,
        familyId: session.user.familyId,
        schedules: [],
      } as any)
      prismaMock.$transaction.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: choreId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete chore')
    })
  })
})
