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
import { DELETE } from '@/app/api/chores/schedules/[scheduleId]/assignments/[assignmentId]/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/chores/schedules/[scheduleId]/assignments/[assignmentId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('DELETE', () => {
    const scheduleId = 'schedule-1'
    const assignmentId = 'assignment-1'
    const getMockAssignment = (session: any) => ({
      id: assignmentId,
      choreSchedule: {
        id: scheduleId,
        choreDefinition: {
          id: 'chore-def-1',
          familyId: session.user.familyId,
        },
        assignments: [
          { id: 'assignment-1', isActive: true },
          { id: 'assignment-2', isActive: true },
        ],
      },
    })

    it('should return 403 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments/456', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ scheduleId, assignmentId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if assignment not found', async () => {
      const session = mockParentSession()

      prismaMock.choreAssignment.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments/456', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ scheduleId, assignmentId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Assignment not found')
    })

    it('should return 400 if trying to delete last assignment', async () => {
      const session = mockParentSession()

      prismaMock.choreAssignment.findUnique.mockResolvedValue({
        ...getMockAssignment(session),
        choreSchedule: {
          ...getMockAssignment(session).choreSchedule,
          assignments: [{ id: 'assignment-1', isActive: true }],
        },
      } as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments/456', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ scheduleId, assignmentId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot remove the last assignment from a schedule')
    })

    it('should soft delete assignment successfully', async () => {
      const session = mockParentSession()

      prismaMock.choreAssignment.findUnique.mockResolvedValue(getMockAssignment(session) as any)
      prismaMock.choreAssignment.update.mockResolvedValue({
        ...getMockAssignment(session),
        isActive: false,
      } as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments/456', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ scheduleId, assignmentId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Assignment removed successfully')

      expect(prismaMock.choreAssignment.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: { isActive: false },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.choreAssignment.findUnique.mockResolvedValue(getMockAssignment(session) as any)
      prismaMock.choreAssignment.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/schedules/123/assignments/456', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ scheduleId, assignmentId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete assignment')
    })
  })
})
