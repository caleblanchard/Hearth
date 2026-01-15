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
import { POST } from '@/app/api/chores/schedules/[scheduleId]/assignments/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { AssignmentType } from '@/app/generated/prisma'

describe('/api/chores/schedules/[scheduleId]/assignments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const scheduleId = 'schedule-1'
    const getMockSchedule = (session: any) => ({
      id: scheduleId,
      assignmentType: AssignmentType.ROTATING,
      choreDefinition: {
        id: 'chore-def-1',
        familyId: session.user.familyId,
      },
      assignments: [],
    })

    const mockNewAssignment = {
      id: 'assignment-1',
      choreScheduleId: scheduleId,
      memberId: 'child-1',
      rotationOrder: 0,
      isActive: true,
      member: {
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
      },
    }

    it('should return 403 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'child-1' }),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 400 if memberId is missing', async () => {
      const session = mockParentSession()

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID is required')
    })

    it('should return 400 if member is already assigned', async () => {
      const session = mockParentSession()

      const mockScheduleWithAssignment = {
        ...getMockSchedule(session),
        assignments: [{ id: 'assignment-1', memberId: 'child-1', isActive: true }],
      }
      prismaMock.choreSchedule.findUnique.mockResolvedValue(mockScheduleWithAssignment as any)
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'child-1' }),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member is already assigned to this schedule')
    })

    it('should create assignment successfully', async () => {
      const session = mockParentSession()

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.choreAssignment.create.mockResolvedValue(mockNewAssignment as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'child-1' }),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.assignment).toEqual(mockNewAssignment)
      expect(data.message).toBe('Assignment created successfully')
    })

    it('should auto-assign rotationOrder for ROTATING type', async () => {
      const session = mockParentSession()

      const mockScheduleWithAssignments = {
        ...getMockSchedule(session),
        assignments: [{ rotationOrder: 2 }],
      }
      prismaMock.choreSchedule.findUnique.mockResolvedValue(mockScheduleWithAssignments as any)
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-2',
        familyId: session.user.familyId,
      } as any)
      prismaMock.choreAssignment.create.mockResolvedValue({
        ...mockNewAssignment,
        rotationOrder: 3,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'child-2' }),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismaMock.choreAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rotationOrder: 3,
          }),
        })
      )
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.choreAssignment.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'child-1' }),
      })

      const response = await POST(request, { params: Promise.resolve({ scheduleId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create assignment')
    })
  })
})
