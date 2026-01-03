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
import { GET, PATCH } from '@/app/api/notifications/preferences/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/notifications/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET /api/notifications/preferences', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return notification preferences for authenticated user', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const mockPreferences = {
        id: 'pref-1',
        userId: 'child-1',
        enabledTypes: ['CHORE_APPROVED', 'REWARD_APPROVED'],
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        pushEnabled: true,
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.notificationPreference.findUnique.mockResolvedValue(mockPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        enabledTypes: ['CHORE_APPROVED', 'REWARD_APPROVED'],
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })
      expect(prismaMock.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
      })
    })

    it('should return default preferences if none exist', async () => {
      const session = mockParentSession({ user: { id: 'parent-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notificationPreference.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        enabledTypes: [],
        quietHoursEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
      })
    })

    it('should handle database errors gracefully', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notificationPreference.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch preferences')
    })
  })

  describe('PATCH /api/notifications/preferences', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ pushEnabled: false }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update notification preferences for authenticated user', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const updates = {
        pushEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'child-1',
        ...updates,
        enabledTypes: [],
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject(updates)
      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
        update: updates,
        create: {
          userId: 'child-1',
          ...updates,
        },
      })
    })

    it('should update enabled notification types', async () => {
      const session = mockParentSession({ user: { id: 'parent-1' } })
      auth.mockResolvedValue(session)

      const updates = {
        enabledTypes: ['CHORE_COMPLETED', 'LEFTOVER_EXPIRING', 'DOCUMENT_EXPIRING'],
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'parent-1',
        enabledTypes: updates.enabledTypes,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        pushEnabled: true,
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences.enabledTypes).toEqual(updates.enabledTypes)
    })

    it('should update specific notification timing preferences', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const updates = {
        leftoverExpiringHours: 12,
        documentExpiringDays: 60,
        carpoolReminderMinutes: 45,
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'child-1',
        ...updates,
        enabledTypes: [],
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        pushEnabled: true,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject(updates)
    })

    it('should validate quiet hours format', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const invalidUpdates = {
        quietHoursStart: 'invalid',
        quietHoursEnd: '07:00',
      }

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quiet hours format')
    })

    it('should validate quiet hours end format', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const invalidUpdates = {
        quietHoursStart: '22:00',
        quietHoursEnd: '25:00',
      }

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quiet hours format')
    })

    it('should validate numeric preference values', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const invalidUpdates = {
        leftoverExpiringHours: -5,
      }

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('must be positive')
    })

    it('should handle database errors gracefully', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.notificationPreference.upsert.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ pushEnabled: false }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update preferences')
    })

    it('should create preferences if they do not exist (upsert behavior)', async () => {
      const session = mockParentSession({ user: { id: 'parent-1' } })
      auth.mockResolvedValue(session)

      const updates = {
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
      }

      const mockCreatedPreferences = {
        id: 'pref-new',
        userId: 'parent-1',
        ...updates,
        enabledTypes: [],
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.notificationPreference.upsert.mockResolvedValue(mockCreatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject(updates)
      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'parent-1' },
        update: updates,
        create: {
          userId: 'parent-1',
          ...updates,
        },
      })
    })
  })
})
