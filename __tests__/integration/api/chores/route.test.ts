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
import { GET, POST } from '@/app/api/chores/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { Frequency, AssignmentType, Difficulty } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/chores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return chores for authenticated parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockChores = [
        {
          id: 'chore-1',
          name: 'Test Chore',
          familyId: session.user.familyId,
          schedules: [
            {
              id: 'schedule-1',
              frequency: Frequency.WEEKLY,
              assignments: [
                {
                  id: 'assignment-1',
                  memberId: 'child-1',
                  member: { id: 'child-1', name: 'Child 1' },
                },
              ],
              _count: { instances: 5 },
            },
          ],
        },
      ]

      prismaMock.choreDefinition.findMany.mockResolvedValue(mockChores as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toEqual(mockChores)
      expect(prismaMock.choreDefinition.findMany).toHaveBeenCalledWith({
        where: { familyId: session.user.familyId },
        include: expect.objectContaining({
          schedules: expect.any(Object),
        }),
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('POST', () => {
    const validChoreData = {
      name: 'New Chore',
      description: 'Test description',
      creditValue: 10,
      difficulty: Difficulty.MEDIUM,
      estimatedMinutes: 30,
      minimumAge: 8,
      iconName: 'broom',
      schedule: {
        assignmentType: AssignmentType.ROTATING,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 1,
        requiresApproval: true,
        requiresPhoto: false,
        assignments: [
          { memberId: 'child-1', rotationOrder: 0 },
          { memberId: 'child-2', rotationOrder: 1 },
        ],
      },
    }

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify(validChoreData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 400 if name is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          name: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if name is too long', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          name: 'a'.repeat(101),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name must be 100 characters or less')
    })

    it('should return 400 if creditValue is negative', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          creditValue: -5,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Credit value must be 0 or greater')
    })

    it('should return 400 if estimatedMinutes is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          estimatedMinutes: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Estimated minutes must be greater than 0')
    })

    it('should return 400 if difficulty is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          difficulty: 'INVALID',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Difficulty must be EASY, MEDIUM, or HARD')
    })

    it('should return 400 if schedule is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Chore',
          creditValue: 10,
          difficulty: Difficulty.MEDIUM,
          estimatedMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Schedule is required')
    })

    it('should return 400 if assignmentType is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            assignmentType: 'INVALID',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid assignment type')
    })

    it('should return 400 if frequency is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            frequency: 'INVALID',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid frequency')
    })

    it('should return 400 if dayOfWeek is missing for weekly frequency', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            frequency: Frequency.WEEKLY,
            dayOfWeek: null,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Day of week is required for weekly/biweekly schedules')
    })

    it('should return 400 if no assignments provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            assignments: [],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('At least one assignment is required')
    })

    it('should return 400 if rotating assignment has less than 2 members', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            assignmentType: AssignmentType.ROTATING,
            assignments: [{ memberId: 'child-1', rotationOrder: 0 }],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Rotating assignments require at least 2 members')
    })

    it('should return 400 if rotation order is not sequential', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          schedule: {
            ...validChoreData.schedule,
            assignments: [
              { memberId: 'child-1', rotationOrder: 0 },
              { memberId: 'child-2', rotationOrder: 2 }, // Missing 1
            ],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Rotation order must be sequential starting from 0')
    })

    it('should create chore successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockCreatedChore = {
        id: 'chore-1',
        name: 'New Chore',
        familyId: session.user.familyId,
        schedules: [
          {
            id: 'schedule-1',
            assignments: [
              { id: 'assignment-1', memberId: 'child-1', member: { id: 'child-1', name: 'Child 1' } },
            ],
          },
        ],
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          choreDefinition: {
            create: jest.fn().mockResolvedValue({ id: 'chore-1', name: 'New Chore' }),
            findUnique: jest.fn().mockResolvedValue(mockCreatedChore),
          },
          choreSchedule: {
            create: jest.fn().mockResolvedValue({ id: 'schedule-1' }),
          },
          choreAssignment: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify(validChoreData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.chore).toBeDefined()
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should trim name and description', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          choreDefinition: {
            create: jest.fn().mockResolvedValue({ id: 'chore-1' }),
            findUnique: jest.fn().mockResolvedValue({ id: 'chore-1', schedules: [] }),
          },
          choreSchedule: {
            create: jest.fn().mockResolvedValue({ id: 'schedule-1' }),
          },
          choreAssignment: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          name: '  Trimmed Name  ',
          description: '  Trimmed Description  ',
        }),
      })

      await POST(request)

      expect(prismaMock.$transaction).toHaveBeenCalled()
      const txCallback = (prismaMock.$transaction as jest.Mock).mock.calls[0][0]
      const mockTx = {
        choreDefinition: {
          create: jest.fn().mockResolvedValue({ id: 'chore-1' }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'chore-1',
            schedules: [],
          }),
        },
        choreSchedule: {
          create: jest.fn().mockResolvedValue({ id: 'schedule-1' }),
        },
        choreAssignment: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      }
      await txCallback(mockTx)

      expect(mockTx.choreDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Trimmed Name',
          description: 'Trimmed Description',
        }),
      })
    })
  })
})
