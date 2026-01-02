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
import { PATCH } from '@/app/api/notifications/mark-all-read/route'
import { mockChildSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/notifications/mark-all-read', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should mark all unread notifications as read', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 })

      const request = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(5)
      expect(data.message).toBe('Marked 5 notifications as read')

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'child-1',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      })
    })

    it('should handle singular message correctly', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Marked 1 notification as read')
    })

    it('should handle zero notifications', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(0)
      expect(data.message).toBe('Marked 0 notifications as read')
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notification.updateMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to mark all notifications as read')
    })
  })
})
