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
import { GET } from '@/app/api/notifications/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return notifications for authenticated user', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'child-1',
          type: 'CHORE_APPROVED',
          title: 'Chore approved',
          message: 'Your chore was approved',
          isRead: false,
          createdAt: new Date(),
        },
      ]

      prismaMock.notification.findMany.mockResolvedValue(mockNotifications as any)
      prismaMock.notification.count
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
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should filter unread notifications when unreadOnly=true', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.findMany.mockResolvedValue([])
      prismaMock.notification.count
        .mockResolvedValueOnce(0) // Total count (filtered)
        .mockResolvedValueOnce(0) // Unread count

      const request = new NextRequest(
        'http://localhost/api/notifications?unreadOnly=true'
      )
      await GET(request)

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'child-1',
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should support pagination', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.findMany.mockResolvedValue([])
      prismaMock.notification.count
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
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 40,
      })
    })

    it('should use default pagination values', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.findMany.mockResolvedValue([])
      prismaMock.notification.count
        .mockResolvedValueOnce(0) // Total count
        .mockResolvedValueOnce(0) // Unread count

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasMore).toBe(false)
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should return unread count separately', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.findMany.mockResolvedValue([])
      prismaMock.notification.count
        .mockResolvedValueOnce(50) // Total count
        .mockResolvedValueOnce(5) // Unread count

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unreadCount).toBe(5)
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'child-1', isRead: false },
      })
    })
  })
})
