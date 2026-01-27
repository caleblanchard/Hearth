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
import { GET, POST } from '@/app/api/calendar/events/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'

describe('/api/calendar/events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/calendar/events')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return events for authenticated user', async () => {
      const session = mockParentSession()

      const mockDbEvents = [
        {
          id: 'event-1',
          family_id: session.user.familyId,
          title: 'Test Event',
          description: null,
          start_time: new Date('2025-01-15').toISOString(),
          end_time: new Date('2025-01-15').toISOString(),
          is_all_day: false,
          location: null,
          event_type: 'GENERAL',
          color: '#3b82f6',
          created_by_id: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          creator: { id: 'user-1', name: 'User 1' },
          assignments: [],
        },
      ]

      const expectedEvents = [
        {
          id: 'event-1',
          familyId: session.user.familyId,
          title: 'Test Event',
          description: null,
          startTime: new Date('2025-01-15').toISOString(),
          endTime: new Date('2025-01-15').toISOString(),
          isAllDay: false,
          location: null,
          eventType: 'GENERAL',
          color: '#3b82f6',
          createdById: 'user-1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          createdBy: { id: 'user-1', name: 'User 1' },
          assignments: [],
          externalId: undefined,
          externalSubscriptionId: undefined,
        },
      ]

      dbMock.calendarEvent.findMany.mockResolvedValue(mockDbEvents as any)

      const request = new NextRequest('http://localhost/api/calendar/events?startDate=2025-01-01&endDate=2025-01-31')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toEqual(expectedEvents)
      expect(dbMock.calendarEvent.findMany).toHaveBeenCalled()
    })

    it('should filter by date range if provided', async () => {
      const session = mockParentSession()

      dbMock.calendarEvent.findMany.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/calendar/events?startDate=2025-01-01&endDate=2025-01-31'
      )
      await GET(request)

      expect(dbMock.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: session.user.familyId,
            startTime: { lte: '2025-01-31' },
            endTime: { gte: '2025-01-01' },
          }),
        })
      )
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

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if title is missing', async () => {
      const session = mockParentSession()

      dbMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

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
      expect(data.error).toBe('Title, start time, and end time are required')
    })

    it('should return 400 if startTime is missing', async () => {
      const session = mockParentSession()

      dbMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          endTime: new Date().toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title, start time, and end time are required')
    })

    it('should create event successfully', async () => {
      const session = mockParentSession()

      dbMock.family.findUnique.mockResolvedValue({ id: session.user.familyId } as any)

      const mockCreatedEvent = {
        id: 'event-1',
        title: 'New Event',
        family_id: session.user.familyId,
        start_time: new Date('2025-01-15T10:00:00Z').toISOString(),
        end_time: new Date('2025-01-15T11:00:00Z').toISOString(),
      }

      dbMock.calendarEvent.create.mockResolvedValue(mockCreatedEvent as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(validEventData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Event created successfully')
      expect(data.event).toBeDefined()
      expect(dbMock.calendarEvent.create).toHaveBeenCalled()
    })

  })
})
