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
import { PATCH, DELETE } from '@/app/api/calendar/events/[id]/route'
import { mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/calendar/events/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const eventId = 'event-1'
    const mockEvent = {
      id: eventId,
      title: 'Original Event',
      description: 'Original description',
      startTime: new Date('2025-01-15T10:00:00Z'),
      endTime: new Date('2025-01-15T11:00:00Z'),
      location: 'Original location',
      isAllDay: false,
      color: '#3b82f6',
      familyId: 'family-1',
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Event' }),
      })

      const response = await PATCH(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if event not found', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Event' }),
      })

      const response = await PATCH(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Event not found')
    })

    it('should return 404 if event belongs to different family', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue({
        ...mockEvent,
        familyId: 'family-2', // Different family
      } as any)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Event' }),
      })

      const response = await PATCH(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Event not found')
    })

    it('should update event successfully', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue(mockEvent as any)

      const updatedEvent = {
        ...mockEvent,
        title: 'Updated Event',
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            update: jest.fn().mockResolvedValue(updatedEvent),
          },
          calendarEventAssignment: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Event' }),
      })

      const response = await PATCH(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event updated successfully')
      expect(data.event).toBeDefined()
    })

    it('should update assignments if provided', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue(mockEvent as any)

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            update: jest.fn().mockResolvedValue(mockEvent),
          },
          calendarEventAssignment: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'PATCH',
        body: JSON.stringify({
          assignedMemberIds: ['child-1', 'child-2'],
        }),
      })

      await PATCH(request, { params: { id: eventId } })

      const txCallback = (prismaMock.$transaction as jest.Mock).mock.calls[0][0]
      const mockTx = {
        calendarEvent: {
          update: jest.fn().mockResolvedValue(mockEvent),
        },
        calendarEventAssignment: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      }
      await txCallback(mockTx)

      expect(mockTx.calendarEventAssignment.deleteMany).toHaveBeenCalledWith({
        where: { eventId },
      })
      expect(mockTx.calendarEventAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { eventId, memberId: 'child-1' },
          { eventId, memberId: 'child-2' },
        ],
      })
    })
  })

  describe('DELETE', () => {
    const eventId = 'event-1'
    const mockEvent = {
      id: eventId,
      familyId: 'family-1',
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if event not found', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Event not found')
    })

    it('should delete event successfully', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findUnique.mockResolvedValue(mockEvent as any)
      prismaMock.calendarEvent.delete.mockResolvedValue(mockEvent as any)

      const request = new NextRequest('http://localhost/api/calendar/events/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: eventId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event deleted successfully')
      expect(prismaMock.calendarEvent.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      })
    })
  })
})
