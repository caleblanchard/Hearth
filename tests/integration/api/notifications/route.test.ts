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
import { GET } from '@/app/api/notifications/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return notifications for authenticated user', async () => {
      const session = mockChildSession()

      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'child-test-123',
          type: 'CHORE_APPROVED',
          title: 'Chore approved',
          message: 'Your chore was approved',
          isRead: false,
          createdAt: new Date(),
        },
      ]

      dbMock.notification.findMany.mockResolvedValue(mockNotifications as any)
      dbMock.notification.count
        .mockResolvedValueOnce(1) // Total count
        .mockResolvedValueOnce(1) // Unread count

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toEqual(mockNotifications)
      expect(data.total).toBe(1)
      expect(data.unreadCount).toBe(1)
      expect(data.hasMore).toBe(false)
      expect(dbMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-test-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should filter unread notifications when unreadOnly=true', async () => {
      const session = mockChildSession()

      dbMock.notification.findMany.mockResolvedValue([])
      dbMock.notification.count
        .mockResolvedValueOnce(0) // Total count (filtered)
        .mockResolvedValueOnce(0) // Unread count

      const request = new NextRequest(
        'http://localhost/api/notifications?unreadOnly=true'
      )
      await GET(request)

      expect(dbMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'child-test-123',
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should support pagination', async () => {
      const session = mockChildSession()

      dbMock.notification.findMany.mockResolvedValue([])
      dbMock.notification.count
        .mockResolvedValueOnce(100) // Total count
        .mockResolvedValueOnce(10) // Unread count

      const request = new NextRequest(
        'http://localhost/api/notifications?limit=20&offset=40'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toBeUndefined() // Response doesn't include pagination object
      expect(data.hasMore).toBe(true)
      expect(dbMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-test-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 40,
      })
    })

    it('should use default pagination values', async () => {
      const session = mockChildSession()

      dbMock.notification.findMany.mockResolvedValue([])
      dbMock.notification.count
        .mockResolvedValueOnce(0) // Total count
        .mockResolvedValueOnce(0) // Unread count

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasMore).toBe(false)
      expect(dbMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-test-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should return unread count separately', async () => {
      const session = mockChildSession()

      dbMock.notification.findMany.mockResolvedValue([])
      dbMock.notification.count
        .mockResolvedValueOnce(50) // Total count
        .mockResolvedValueOnce(5) // Unread count

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unreadCount).toBe(5)
      expect(dbMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'child-test-123', isRead: false },
      })
    })
  })
})
