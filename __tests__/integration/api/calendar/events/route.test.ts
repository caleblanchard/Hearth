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
import { GET, POST } from '@/app/api/calendar/events/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/calendar/events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return events for authenticated user', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockEvents = [
        {
          id: 'event-1',
          title: 'Test Event',
          familyId: session.user.familyId,
          startTime: new Date('2025-01-15'),
          endTime: new Date('2025-01-15'),
          createdBy: { id: 'user-1', name: 'User 1' },
          assignments: [],
        },
      ]

      prismaMock.calendarEvent.findMany.mockResolvedValue(mockEvents as any)

      const request = new NextRequest('http://localhost/api/calendar/events')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toEqual(mockEvents)
      expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith({
        where: { familyId: session.user.familyId },
        include: expect.objectContaining({
          createdBy: expect.any(Object),
          assignments: expect.any(Object),
        }),
        orderBy: { startTime: 'asc' },
      })
    })

    it('should filter by date range if provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.calendarEvent.findMany.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/calendar/events?startDate=2025-01-01&endDate=2025-01-31'
      )
      await GET(request)

      expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          OR: [
            {
              startTime: {
                gte: new Date('2025-01-01'),
                lte: new Date('2025-01-31'),
              },
            },
            {
              endTime: {
                gte: new Date('2025-01-01'),
                lte: new Date('2025-01-31'),
              },
            },
            {
              AND: [
                { startTime: { lte: new Date('2025-01-01') } },
                { endTime: { gte: new Date('2025-01-31') } },
              ],
            },
          ],
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      })
    })
  })

  describe('POST', () => {
    const validEventData = {
      title: 'New Event',
      description: 'Test description',
      startTime: '2025-01-15T10:00:00Z',
      endTime: '2025-01-15T11:00:00Z',
      location: 'Test Location',
      isAllDay: false,
      color: '#3b82f6',
      assignedMemberIds: ['child-1', 'child-2'],
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if family not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family not found')
    })

    it('should return 400 if title is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          ...validEventData,
          title: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title and start time are required')
    })

    it('should return 400 if startTime is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          ...validEventData,
          startTime: null,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title and start time are required')
    })

    it('should create event successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const mockCreatedEvent = {
        id: 'event-1',
        title: 'New Event',
        familyId: session.user.familyId,
        startTime: new Date('2025-01-15T10:00:00Z'),
        endTime: new Date('2025-01-15T11:00:00Z'),
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            create: jest.fn().mockResolvedValue(mockCreatedEvent),
          },
          calendarEventAssignment: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event created successfully')
      expect(data.event).toBeDefined()
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should use startTime as endTime if endTime not provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const eventDataWithoutEndTime = {
        title: 'New Event',
        startTime: '2025-01-15T10:00:00Z',
      }

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            create: jest.fn().mockResolvedValue({ id: 'event-1' }),
          },
          calendarEventAssignment: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventDataWithoutEndTime),
      })

      await POST(request)

      const txCallback = (prismaMock.$transaction as jest.Mock).mock.calls[0][0]
      const mockTx = {
        calendarEvent: {
          create: jest.fn(),
        },
        calendarEventAssignment: {
          createMany: jest.fn(),
        },
      }
      await txCallback(mockTx)

      expect(mockTx.calendarEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endTime: new Date('2025-01-15T10:00:00Z'),
        }),
      })
    })

    it('should create assignments if provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            create: jest.fn().mockResolvedValue({ id: 'event-1' }),
          },
          calendarEventAssignment: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return await callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      await POST(request)

      const txCallback = (prismaMock.$transaction as jest.Mock).mock.calls[0][0]
      const mockTx = {
        calendarEvent: {
          create: jest.fn().mockResolvedValue({ id: 'event-1' }),
        },
        calendarEventAssignment: {
          createMany: jest.fn(),
        },
      }
      await txCallback(mockTx)

      expect(mockTx.calendarEventAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: 'event-1', memberId: 'child-1' },
          { eventId: 'event-1', memberId: 'child-2' },
        ],
      })
    })
  })
})
