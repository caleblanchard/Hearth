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
import { GET, PATCH } from '@/app/api/notifications/preferences/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/notifications/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET /api/notifications/preferences', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return notification preferences for authenticated user', async () => {
      const session = mockChildSession()

      const mockPreferences = {
        id: 'pref-1',
        userId: 'child-test-123',
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

      dbMock.notificationPreference.findUnique.mockResolvedValue(mockPreferences as any)

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
      expect(dbMock.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'child-test-123' },
      })
    })

    it('should return default preferences if none exist', async () => {
      const session = mockParentSession()

      dbMock.notificationPreference.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        enabled_types: [],
        quiet_hours_enabled: false,
        push_enabled: true,
        in_app_enabled: true,
        leftover_expiring_hours: 24,
        document_expiring_days: 90,
        carpool_reminder_minutes: 30,
      })
    })

    it('should handle database errors gracefully', async () => {
      const session = mockChildSession()

      dbMock.notificationPreference.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch preferences')
    })
  })

  describe('PATCH /api/notifications/preferences', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ push_enabled: false }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update notification preferences for authenticated user', async () => {
      const session = mockChildSession()

      const updates = {
        push_enabled: false,
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'child-test-123',
        pushEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
        enabledTypes: [],
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      dbMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        pushEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      })
      expect(dbMock.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'child-test-123' },
        update: {
          pushEnabled: false,
          quietHoursEnabled: true,
          quietHoursEnd: '08:00',
          quietHoursStart: '21:00',
        },
        create: {
          userId: 'child-test-123',
          pushEnabled: false,
          quietHoursEnabled: true,
          quietHoursEnd: '08:00',
          quietHoursStart: '21:00',
        },
      })
    })

    it('should update enabled notification types', async () => {
      const session = mockParentSession()

      const updates = {
        enabled_types: ['CHORE_COMPLETED', 'LEFTOVER_EXPIRING', 'DOCUMENT_EXPIRING'],
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'parent-test-123',
        enabledTypes: updates.enabled_types,
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

      dbMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences.enabledTypes).toEqual(updates.enabled_types)
    })

    it('should update specific notification timing preferences', async () => {
      const session = mockChildSession()

      const updates = {
        leftover_expiring_hours: 12,
        document_expiring_days: 60,
        carpool_reminder_minutes: 45,
      }

      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'child-test-123',
        leftoverExpiringHours: 12,
        documentExpiringDays: 60,
        carpoolReminderMinutes: 45,
        enabledTypes: [],
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        pushEnabled: true,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      dbMock.notificationPreference.upsert.mockResolvedValue(mockUpdatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        leftoverExpiringHours: 12,
        documentExpiringDays: 60,
        carpoolReminderMinutes: 45,
      })
    })

    it('should validate quiet hours format', async () => {
      const session = mockChildSession()

      const invalidUpdates = {
        quiet_hours_start: 'invalid',
        quiet_hours_end: '07:00',
      }

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quiet hours start format')
    })

    it('should validate quiet hours end format', async () => {
      const session = mockChildSession()

      const invalidUpdates = {
        quiet_hours_start: '22:00',
        quiet_hours_end: '25:00',
      }

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quiet hours end format')
    })

    it('should validate numeric preference values', async () => {
      const session = mockChildSession()

      const invalidUpdates = {
        leftover_expiring_hours: -5,
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
      const session = mockChildSession()

      dbMock.notificationPreference.upsert.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ push_enabled: false }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update preferences')
    })

    it('should create preferences if they do not exist (upsert behavior)', async () => {
      const session = mockParentSession()

      const updates = {
        push_enabled: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '23:00',
        quiet_hours_end: '06:00',
      }

      const mockCreatedPreferences = {
        id: 'pref-new',
        userId: 'parent-test-123',
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
        enabledTypes: [],
        inAppEnabled: true,
        leftoverExpiringHours: 24,
        documentExpiringDays: 90,
        carpoolReminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      dbMock.notificationPreference.upsert.mockResolvedValue(mockCreatedPreferences as any)

      const request = new NextRequest('http://localhost/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
      })
      expect(dbMock.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'parent-test-123' },
        update: {
          pushEnabled: true,
          quietHoursEnabled: true,
          quietHoursEnd: '06:00',
          quietHoursStart: '23:00',
        },
        create: {
          userId: 'parent-test-123',
          pushEnabled: true,
          quietHoursEnabled: true,
          quietHoursEnd: '06:00',
          quietHoursStart: '23:00',
        },
      })
    })
  })
})
