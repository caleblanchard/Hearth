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
import { GET, POST } from '@/app/api/financial/budgets/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { SpendingCategory } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/financial/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/financial/budgets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return budgets for authenticated user', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const mockBudgets = [
        {
          id: 'budget-1',
          memberId: session.user.id,
          category: SpendingCategory.REWARDS,
          limitAmount: 1000,
          period: 'monthly',
          isActive: true,
          periods: [],
          member: {
            id: session.user.id,
            name: session.user.name,
          },
        },
      ]

      prismaMock.budget.findMany.mockResolvedValue(mockBudgets as any)

      const request = new NextRequest('http://localhost/api/financial/budgets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.budgets).toEqual(mockBudgets)
      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          memberId: session.user.id,
          isActive: true,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          periods: {
            orderBy: {
              periodStart: 'desc',
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: 'REWARDS',
          limitAmount: 1000,
          period: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if category is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          limitAmount: 1000,
          period: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Category is required')
    })

    it('should return 400 if limitAmount is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          category: 'REWARDS',
          period: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Limit amount must be positive')
    })

    it('should return 400 if limitAmount is negative', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          category: 'REWARDS',
          limitAmount: -100,
          period: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Limit amount must be positive')
    })

    it('should return 400 if period is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          category: 'REWARDS',
          limitAmount: 1000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Period must be "weekly" or "monthly"')
    })

    it('should return 400 if budget already exists for category and period', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.budget.findFirst.mockResolvedValue({
        id: 'existing-budget',
        memberId: 'child-1',
        category: SpendingCategory.REWARDS,
        period: 'monthly',
      } as any)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          category: 'REWARDS',
          limitAmount: 1000,
          period: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should create budget successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.budget.findFirst.mockResolvedValue(null) // No existing budget
      prismaMock.budget.create.mockResolvedValue({
        id: 'new-budget-1',
        memberId: 'child-1',
        category: SpendingCategory.REWARDS,
        limitAmount: 1000,
        period: 'monthly',
        resetDay: 0,
        isActive: true,
        createdAt: new Date(),
        member: {
          id: 'child-1',
          name: 'Child One',
        },
      } as any)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          category: 'REWARDS',
          limitAmount: 1000,
          period: 'monthly',
          resetDay: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.budget).toBeDefined()
      expect(prismaMock.budget.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-1',
          category: SpendingCategory.REWARDS,
          limitAmount: 1000,
          period: 'monthly',
          resetDay: 0,
          isActive: true,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/financial/budgets', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create budget')
    })
  })
})
