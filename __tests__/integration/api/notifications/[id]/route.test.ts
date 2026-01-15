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
import { PATCH, DELETE } from '@/app/api/notifications/[id]/route'
import { mockChildSession } from '@/lib/test-utils/auth-mock'

describe('/api/notifications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const notificationId = 'notification-1'
    const mockNotification = {
      id: notificationId,
      userId: 'child-1',
      isRead: false,
      readAt: null,
    }

    const mockUpdatedNotification = {
      ...mockNotification,
      isRead: true,
      readAt: new Date(),
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'PATCH',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if notification not found', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'PATCH',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Notification not found')
    })

    it('should return 403 if notification belongs to different user', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'different-user',
      } as any)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'PATCH',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should mark notification as read', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(mockNotification as any)
      prismaMock.notification.update.mockResolvedValue(mockUpdatedNotification as any)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'PATCH',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notification).toEqual(mockUpdatedNotification)

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(mockNotification as any)
      prismaMock.notification.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'PATCH',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to mark notification as read')
    })
  })

  describe('DELETE', () => {
    const notificationId = 'notification-1'
    const mockNotification = {
      id: notificationId,
      userId: 'child-1',
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if notification not found', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Notification not found')
    })

    it('should return 403 if notification belongs to different user', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'different-user',
      } as any)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should delete notification successfully', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(mockNotification as any)
      prismaMock.notification.delete.mockResolvedValue(mockNotification as any)

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      expect(prismaMock.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()

      prismaMock.notification.findUnique.mockResolvedValue(mockNotification as any)
      prismaMock.notification.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: notificationId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete notification')
    })
  })
})
