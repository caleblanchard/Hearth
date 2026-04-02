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
import { GET, POST } from '@/app/api/chores/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { Frequency, AssignmentType, Difficulty } from '@/lib/enums'

jest.mock('@/lib/sick-mode', () => ({
  isMemberInSickMode: jest.fn().mockResolvedValue(false),
}));

describe('/api/chores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return chores for authenticated parent', async () => {
      const session = mockParentSession()

      const mockChores = [
        {
          id: 'chore-1',
          name: 'Test Chore',
          family_id: 'family-test-123',
          credit_value: 10,
          difficulty: 'EASY',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockSchedules = [
        {
          id: 'schedule-1',
          chore_definition_id: 'chore-1',
          frequency: Frequency.WEEKLY,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockAssignments = [
        {
          id: 'assignment-1',
          chore_schedule_id: 'schedule-1',
          member_id: 'child-1',
          member: { id: 'child-1', name: 'Child 1' },
          is_active: true,
        },
      ]

      const mockInstances = [
        { chore_schedule_id: 'schedule-1' },
        { chore_schedule_id: 'schedule-1' },
        { chore_schedule_id: 'schedule-1' },
        { chore_schedule_id: 'schedule-1' },
        { chore_schedule_id: 'schedule-1' },
      ]

      dbMock.choreDefinition.findMany.mockResolvedValue(mockChores as any)
      dbMock.choreSchedule.findMany.mockResolvedValue(mockSchedules as any)
      dbMock.choreAssignment.findMany.mockResolvedValue(mockAssignments as any)
      dbMock.choreInstance.findMany.mockResolvedValue(mockInstances as any)

      const request = new NextRequest('http://localhost/api/chores')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify structure matches what the API returns (camelCase)
      expect(data.data[0]).toMatchObject({
        id: 'chore-1',
        name: 'Test Chore',
        creditValue: 10,
        difficulty: 'EASY',
        schedules: [
          expect.objectContaining({
            id: 'schedule-1',
            frequency: Frequency.WEEKLY,
            _count: { instances: 5 },
            assignments: [
              expect.objectContaining({
                id: 'assignment-1',
                memberId: 'child-1',
              }),
            ],
          }),
        ],
      })
      
      expect(dbMock.choreDefinition.findMany).toHaveBeenCalled()
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

      // Mock implementation
      dbMock.choreDefinition.create.mockResolvedValue({ id: 'chore-1', name: 'New Chore' } as any)
      dbMock.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any)
      dbMock.choreAssignment.create.mockResolvedValue({ count: 2 } as any)
      dbMock.choreAssignment.createMany.mockResolvedValue({ count: 2 } as any)
      
      // Mock fetching the complete chore
      dbMock.choreDefinition.findUnique.mockResolvedValue(mockCreatedChore as any)
      dbMock.choreSchedule.findMany.mockResolvedValue([{ id: 'schedule-1', choreDefinitionId: 'chore-1' }] as any)
      dbMock.choreAssignment.findMany.mockResolvedValue([{ id: 'assignment-1', choreScheduleId: 'schedule-1', memberId: 'child-1' }] as any)
      
      // Mock ancillary tables
      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.choreInstance.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify(validChoreData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.chore).toBeDefined()
      
      expect(dbMock.choreDefinition.create).toHaveBeenCalled()
      expect(dbMock.choreSchedule.create).toHaveBeenCalled()
      expect(dbMock.choreAssignment.createMany).toHaveBeenCalled()
    })

    it('should trim name and description', async () => {
      const session = mockParentSession()

      // Mock implementation
      dbMock.choreDefinition.create.mockResolvedValue({ id: 'chore-1' } as any)
      dbMock.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any)
      dbMock.choreAssignment.create.mockResolvedValue({ count: 2 } as any)
      dbMock.choreAssignment.createMany.mockResolvedValue({ count: 2 } as any)
      
      dbMock.choreDefinition.findUnique.mockResolvedValue({ id: 'chore-1', schedules: [] } as any)
      dbMock.choreSchedule.findMany.mockResolvedValue([{ id: 'schedule-1', choreDefinitionId: 'chore-1' }] as any)
      dbMock.choreAssignment.findMany.mockResolvedValue([] as any)
      
      dbMock.auditLog.create.mockResolvedValue({} as any)
      dbMock.choreInstance.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          ...validChoreData,
          name: '  Trimmed Name  ',
          description: '  Trimmed Description  ',
        }),
      })

      await POST(request)

      expect(dbMock.choreDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Trimmed Name',
          description: 'Trimmed Description',
        }),
      })
    })
  })
})
