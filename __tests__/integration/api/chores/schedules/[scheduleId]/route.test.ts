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
import { PATCH } from '@/app/api/chores/schedules/[scheduleId]/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { Frequency } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/chores/schedules/[scheduleId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const scheduleId = 'schedule-1'
    const getMockSchedule = (session: any) => ({
      id: scheduleId,
      choreDefinition: {
        id: 'chore-def-1',
        familyId: session.user.familyId,
      },
    })

    const getMockUpdatedSchedule = (session: any) => ({
      ...getMockSchedule(session),
      frequency: 'WEEKLY',
      dayOfWeek: 1,
      requiresApproval: true,
      requiresPhoto: false,
      assignments: [],
      choreDefinition: {
        ...getMockSchedule(session).choreDefinition,
      },
    })

    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'WEEKLY' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'WEEKLY' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if schedule not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'WEEKLY' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })

    it('should return 400 if frequency is invalid', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'INVALID' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid frequency')
    })

    it('should return 400 if weekly frequency missing dayOfWeek', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'WEEKLY' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Day of week is required for weekly/biweekly schedules')
    })

    it('should return 400 if custom frequency missing customCron', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'CUSTOM' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Custom cron expression is required for custom frequency')
    })

    it('should update schedule successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)
      prismaMock.choreSchedule.update.mockResolvedValue(getMockUpdatedSchedule(session) as any)

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({
          frequency: 'WEEKLY',
          dayOfWeek: 1,
          requiresApproval: true,
          requiresPhoto: false,
        }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.schedule).toMatchObject({
        frequency: 'WEEKLY',
        dayOfWeek: 1,
        requiresApproval: true,
        requiresPhoto: false,
      })
      expect(data.message).toBe('Schedule updated successfully')
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.choreSchedule.findUnique.mockResolvedValue(getMockSchedule(session) as any)
      prismaMock.choreSchedule.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chores/schedules/123', {
        method: 'PATCH',
        body: JSON.stringify({ frequency: 'DAILY' }),
      })

      const response = await PATCH(request, { params: { scheduleId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update schedule')
    })
  })
})
