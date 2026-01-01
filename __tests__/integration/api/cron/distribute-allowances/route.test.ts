// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// NOW import after mocks
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/distribute-allowances/route'
import { Frequency } from '@/app/generated/prisma'
import { mockCurrentDate, restoreRealTimers } from '@/lib/test-utils/date-helpers'

describe('/api/cron/distribute-allowances', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeAll(() => {
    process.env.CRON_SECRET = 'test-secret-123'
  })

  afterAll(() => {
    process.env.CRON_SECRET = originalEnv
    restoreRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
    // Mock current date: Sunday, January 5, 2025
    mockCurrentDate(new Date('2025-01-05T01:00:00Z'))
  })

  afterEach(() => {
    restoreRealTimers()
  })

  describe('Authorization', () => {
    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest('http://localhost/api/cron/distribute-allowances')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if CRON_SECRET does not match', async () => {
      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept valid CRON_SECRET', async () => {
      prismaMock.allowanceSchedule.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Allowance Distribution', () => {
    it('should distribute weekly allowance on correct day', async () => {
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0, // Sunday
        dayOfMonth: null,
        isActive: true,
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
        member: {
          id: 'child-1',
          name: 'Child 1',
          familyId: 'family-1',
        },
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)

      // Mock balance
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'child-1',
        currentBalance: 1000,
        lifetimeEarned: 5000,
        lifetimeSpent: 4000,
      } as any)

      // Mock transaction
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
      expect(data.skipped).toBe(0)
    })

    it('should skip paused schedules', async () => {
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0,
        dayOfMonth: null,
        isActive: true,
        isPaused: true, // Paused
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.skipped).toBe(1)
    })

    it('should skip inactive schedules', async () => {
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0,
        dayOfMonth: null,
        isActive: false, // Inactive
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.skipped).toBe(1)
    })

    it('should skip schedule on wrong day', async () => {
      // Current date is Sunday (0), schedule is for Monday (1)
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 1, // Monday
        dayOfMonth: null,
        isActive: true,
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.skipped).toBe(1)
    })

    it('should skip already processed today', async () => {
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0,
        dayOfMonth: null,
        isActive: true,
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: new Date('2025-01-05T00:00:00Z'), // Already processed today
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.skipped).toBe(1)
    })

    it('should process monthly allowance on correct day', async () => {
      // Set current date to 15th of month
      mockCurrentDate(new Date('2025-01-15T01:00:00Z'))

      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 2000,
        frequency: Frequency.MONTHLY,
        dayOfWeek: null,
        dayOfMonth: 15,
        isActive: true,
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
        member: {
          id: 'child-1',
          name: 'Child 1',
          familyId: 'family-1',
        },
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'child-1',
        currentBalance: 1000,
      } as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
    })

    it('should handle multiple schedules', async () => {
      const schedules = [
        {
          id: 'schedule-1',
          memberId: 'child-1',
          amount: 500,
          frequency: Frequency.WEEKLY,
          dayOfWeek: 0,
          dayOfMonth: null,
          isActive: true,
          isPaused: false,
          startDate: new Date('2025-01-01'),
          endDate: null,
          lastProcessedAt: null,
          member: { id: 'child-1', name: 'Child 1', familyId: 'family-1' },
        },
        {
          id: 'schedule-2',
          memberId: 'child-2',
          amount: 600,
          frequency: Frequency.WEEKLY,
          dayOfWeek: 0,
          dayOfMonth: null,
          isActive: true,
          isPaused: false,
          startDate: new Date('2025-01-01'),
          endDate: null,
          lastProcessedAt: null,
          member: { id: 'child-2', name: 'Child 2', familyId: 'family-1' },
        },
        {
          id: 'schedule-3',
          memberId: 'child-3',
          amount: 700,
          frequency: Frequency.WEEKLY,
          dayOfWeek: 1, // Monday - wrong day
          dayOfMonth: null,
          isActive: true,
          isPaused: false,
          startDate: new Date('2025-01-01'),
          endDate: null,
          lastProcessedAt: null,
          member: { id: 'child-3', name: 'Child 3', familyId: 'family-1' },
        },
      ]

      prismaMock.allowanceSchedule.findMany.mockResolvedValue(schedules as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        currentBalance: 1000,
      } as any)
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock)
      })

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(2) // schedule-1 and schedule-2
      expect(data.skipped).toBe(1) // schedule-3
    })

    it('should handle errors gracefully', async () => {
      const schedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0,
        dayOfMonth: null,
        isActive: true,
        isPaused: false,
        startDate: new Date('2025-01-01'),
        endDate: null,
        lastProcessedAt: null,
        member: { id: 'child-1', name: 'Child 1', familyId: 'family-1' },
      }

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([schedule] as any)
      prismaMock.creditBalance.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/cron/distribute-allowances', {
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.errors).toBeGreaterThan(0)
    })
  })
})
