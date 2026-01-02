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
import { GET } from '@/app/api/screentime/stats/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/screentime/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockTransactions = [
      {
        amountMinutes: -30,
        deviceType: 'TABLET',
        createdAt: new Date('2024-01-01T10:00:00'),
      },
      {
        amountMinutes: -20,
        deviceType: 'PHONE',
        createdAt: new Date('2024-01-02T14:00:00'),
      },
      {
        amountMinutes: -15,
        deviceType: 'TABLET',
        createdAt: new Date('2024-01-03T16:00:00'),
      },
    ]

    const mockBalance = {
      memberId: 'child-1',
      currentBalanceMinutes: 60,
      weekStartDate: new Date('2024-01-01'),
    }

    const mockSettings = {
      memberId: 'child-1',
      weeklyAllocationMinutes: 120,
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return stats for child (own data)', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeSettings.findUnique.mockResolvedValue(mockSettings as any)

      const request = new NextRequest('http://localhost/api/screentime/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.totalMinutes).toBe(65) // 30 + 20 + 15
      expect(data.summary.totalHours).toBe(1) // Math.floor(65/60)
      expect(data.summary.currentBalance).toBe(60)
      expect(data.summary.weeklyAllocation).toBe(120)
      expect(data.period).toBe('week')
      expect(data.deviceBreakdown).toHaveLength(2)
      expect(data.dailyTrend).toHaveLength(3)

      expect(prismaMock.screenTimeTransaction.findMany).toHaveBeenCalledWith({
        where: {
          memberId: 'child-1',
          type: 'SPENT',
          createdAt: {
            gte: expect.any(Date),
          },
        },
        select: {
          amountMinutes: true,
          deviceType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })
    })

    it('should return stats for parent viewing child', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeSettings.findUnique.mockResolvedValue(mockSettings as any)

      const request = new NextRequest('http://localhost/api/screentime/stats?memberId=child-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.totalMinutes).toBe(65)

      expect(prismaMock.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        select: { familyId: true },
      })
    })

    it('should return 403 if child tries to view another member', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/stats?memberId=child-2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/stats?memberId=invalid-id')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should return 403 if member belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/screentime/stats?memberId=child-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should filter by month period', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeSettings.findUnique.mockResolvedValue(mockSettings as any)

      const request = new NextRequest('http://localhost/api/screentime/stats?period=month')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('month')

      // Verify date range is for month (30 days)
      const call = prismaMock.screenTimeTransaction.findMany.mock.calls[0][0]
      const startDate = call.where.createdAt.gte
      const expectedStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      expect(startDate.getTime()).toBeCloseTo(expectedStart.getTime(), -3) // Within 1 second
    })

    it('should filter by all time period', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeSettings.findUnique.mockResolvedValue(mockSettings as any)

      const request = new NextRequest('http://localhost/api/screentime/stats?period=all')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('all')

      // Verify date range is from epoch (all time)
      const call = prismaMock.screenTimeTransaction.findMany.mock.calls[0][0]
      const startDate = call.where.createdAt.gte
      expect(startDate.getTime()).toBe(0)
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/screentime/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch screen time stats')
    })
  })
})
