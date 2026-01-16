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
import { POST, DELETE } from '@/app/api/notifications/subscribe/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/notifications/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST /api/notifications/subscribe', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(validSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create push subscription for authenticated user', async () => {
      const session = mockChildSession()

      const mockCreatedSubscription = {
        id: 'sub-1',
        userId: 'child-1',
        endpoint: validSubscription.endpoint,
        p256dh: validSubscription.keys.p256dh,
        auth: validSubscription.keys.auth,
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.pushSubscription.upsert.mockResolvedValue(mockCreatedSubscription as any)

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        body: JSON.stringify(validSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toMatchObject({
        endpoint: validSubscription.endpoint,
        userId: 'child-1',
      })
      expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: validSubscription.endpoint },
        update: {
          p256dh: validSubscription.keys.p256dh,
          auth: validSubscription.keys.auth,
          userAgent: 'Mozilla/5.0',
        },
        create: {
          userId: 'child-1',
          endpoint: validSubscription.endpoint,
          p256dh: validSubscription.keys.p256dh,
          auth: validSubscription.keys.auth,
          userAgent: 'Mozilla/5.0',
        },
      })
    })

    it('should update existing subscription if endpoint already exists', async () => {
      const session = mockParentSession()

      const mockUpdatedSubscription = {
        id: 'sub-1',
        userId: 'parent-1',
        endpoint: validSubscription.endpoint,
        p256dh: 'updated-key',
        auth: 'updated-auth',
        userAgent: 'Chrome/120.0',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      }

      prismaMock.pushSubscription.upsert.mockResolvedValue(mockUpdatedSubscription as any)

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'user-agent': 'Chrome/120.0',
        },
        body: JSON.stringify(validSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toBeDefined()
    })

    it('should return 400 if subscription is missing endpoint', async () => {
      const session = mockChildSession()

      const invalidSubscription = {
        keys: {
          p256dh: 'key',
          auth: 'auth',
        },
      }

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(invalidSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid subscription')
    })

    it('should return 400 if subscription is missing keys', async () => {
      const session = mockChildSession()

      const invalidSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      }

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(invalidSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid subscription')
    })

    it('should return 400 if p256dh key is missing', async () => {
      const session = mockChildSession()

      const invalidSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: {
          auth: 'auth',
        },
      }

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(invalidSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid subscription')
    })

    it('should return 400 if auth key is missing', async () => {
      const session = mockChildSession()

      const invalidSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: {
          p256dh: 'key',
        },
      }

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(invalidSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid subscription')
    })

    it('should handle database errors gracefully', async () => {
      const session = mockChildSession()

      prismaMock.pushSubscription.upsert.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(validSubscription),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save subscription')
    })
  })

  describe('DELETE /api/notifications/subscribe', () => {
    const endpointToDelete = 'https://fcm.googleapis.com/fcm/send/abc123'

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: endpointToDelete }),
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should delete push subscription for authenticated user', async () => {
      const session = mockChildSession()

      prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: endpointToDelete }),
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Subscription removed')
      expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'child-1',
          endpoint: endpointToDelete,
        },
      })
    })

    it('should only delete subscriptions owned by the authenticated user', async () => {
      const session = mockParentSession()

      prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: endpointToDelete }),
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Subscription removed')
      expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'parent-1',
          endpoint: endpointToDelete,
        },
      })
    })

    it('should return 400 if endpoint is missing', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Endpoint required')
    })

    it('should handle database errors gracefully', async () => {
      const session = mockChildSession()

      prismaMock.pushSubscription.deleteMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: endpointToDelete }),
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to remove subscription')
    })
  })
})
