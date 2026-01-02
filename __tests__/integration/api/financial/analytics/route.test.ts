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

// Mock financial-analytics
jest.mock('@/lib/financial-analytics', () => ({
  calculateAnalytics: jest.fn(),
  getSpendingByCategory: jest.fn(),
  getTrends: jest.fn(),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/financial/analytics/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { CreditTransactionType, SpendingCategory } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')
const {
  calculateAnalytics,
  getSpendingByCategory,
  getTrends,
} = require('@/lib/financial-analytics')

describe('/api/financial/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        type: CreditTransactionType.EARNED,
        amount: 100,
        category: SpendingCategory.CHORES,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'tx-2',
        type: CreditTransactionType.SPENT,
        amount: 50,
        category: SpendingCategory.REWARDS,
        createdAt: new Date('2024-01-02'),
      },
    ]

    const mockSummary = {
      totalEarned: 100,
      totalSpent: 50,
      netBalance: 50,
      transactionCount: 2,
    }

    const mockSpendingByCategory = {
      [SpendingCategory.REWARDS]: 50,
      [SpendingCategory.CHORES]: 0,
    }

    const mockTrends = [
      { period: '2024-01', earned: 100, spent: 50 },
    ]

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/financial/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return analytics for child (own data only)', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
      calculateAnalytics.mockReturnValue(mockSummary)
      getSpendingByCategory.mockReturnValue(mockSpendingByCategory)
      getTrends.mockReturnValue(mockTrends)

      const request = new NextRequest('http://localhost/api/financial/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toEqual(mockSummary)
      expect(data.spendingByCategory).toEqual(mockSpendingByCategory)
      expect(data.trends).toEqual(mockTrends)
      expect(data.period).toBe('monthly')

      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          memberId: session.user.id,
        },
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return analytics for parent (all family data)', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
      calculateAnalytics.mockReturnValue(mockSummary)
      getSpendingByCategory.mockReturnValue(mockSpendingByCategory)
      getTrends.mockReturnValue(mockTrends)

      const request = new NextRequest('http://localhost/api/financial/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toEqual(mockSummary)

      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should filter by memberId for parent when provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
      calculateAnalytics.mockReturnValue(mockSummary)
      getSpendingByCategory.mockReturnValue(mockSpendingByCategory)
      getTrends.mockReturnValue(mockTrends)

      const request = new NextRequest(
        'http://localhost/api/financial/analytics?memberId=child-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          memberId: 'child-1',
        },
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should filter by date range when provided', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
      calculateAnalytics.mockReturnValue(mockSummary)
      getSpendingByCategory.mockReturnValue(mockSpendingByCategory)
      getTrends.mockReturnValue(mockTrends)

      const request = new NextRequest(
        'http://localhost/api/financial/analytics?startDate=2024-01-01&endDate=2024-01-31'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should use weekly period when specified', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
      calculateAnalytics.mockReturnValue(mockSummary)
      getSpendingByCategory.mockReturnValue(mockSpendingByCategory)
      getTrends.mockReturnValue(mockTrends)

      const request = new NextRequest(
        'http://localhost/api/financial/analytics?period=weekly'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period).toBe('weekly')
      expect(getTrends).toHaveBeenCalledWith(mockTransactions, 'weekly')
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.creditTransaction.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/financial/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch analytics')
    })
  })
})
