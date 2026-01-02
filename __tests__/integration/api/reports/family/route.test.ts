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
import { GET } from '@/app/api/reports/family/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus, TodoStatus, CreditTransactionType, ScreenTimeTransactionType } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/reports/family', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockMembers = [
      {
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
      },
    ]

    const mockChores = [
      {
        id: 'chore-1',
        assignedToId: 'child-1',
        status: ChoreStatus.APPROVED,
        completedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'chore-2',
        assignedToId: 'child-1',
        status: ChoreStatus.PENDING,
        completedAt: null,
        createdAt: new Date('2024-01-02'),
      },
    ]

    const mockCredits = [
      {
        id: 'tx-1',
        memberId: 'child-1',
        type: CreditTransactionType.CHORE_REWARD,
        amount: 50,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'tx-2',
        memberId: 'child-1',
        type: CreditTransactionType.REWARD_REDEMPTION,
        amount: -30,
        createdAt: new Date('2024-01-02'),
      },
    ]

    const mockScreenTime = [
      {
        id: 'st-1',
        memberId: 'child-1',
        type: ScreenTimeTransactionType.SPENT,
        amountMinutes: -60,
        deviceType: 'TABLET',
        createdAt: new Date('2024-01-01'),
      },
    ]

    const mockTodos = [
      {
        id: 'todo-1',
        assignedToId: 'child-1',
        createdById: 'child-1',
        status: TodoStatus.COMPLETED,
        createdAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
      },
    ]

    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should generate report for week period', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.choreInstance.findMany.mockResolvedValue(mockChores as any)
      prismaMock.creditTransaction.findMany.mockResolvedValue(mockCredits as any)
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockScreenTime as any)
      prismaMock.todoItem.findMany.mockResolvedValue(mockTodos as any)

      const request = new NextRequest('http://localhost/api/reports/family?period=week')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period.type).toBe('week')
      expect(data.summary.chores.completed).toBe(1)
      expect(data.summary.chores.assigned).toBe(2)
      expect(data.summary.credits.earned).toBe(50)
      expect(data.summary.credits.spent).toBe(30)
      expect(data.summary.screenTime.totalMinutes).toBe(60)
      expect(data.children).toHaveLength(1)
      expect(data.trends).toBeDefined()
    })

    it('should generate report for custom date range', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.choreInstance.findMany.mockResolvedValue([])
      prismaMock.creditTransaction.findMany.mockResolvedValue([])
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([])
      prismaMock.todoItem.findMany.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/reports/family?period=custom&startDate=2024-01-01&endDate=2024-01-31'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.period.type).toBe('custom')
      expect(data.period.startDate).toBe('2024-01-01T00:00:00.000Z')
      expect(data.period.endDate).toBe('2024-01-31T00:00:00.000Z')
    })

    it('should calculate per-child breakdown', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.choreInstance.findMany.mockResolvedValue(mockChores as any)
      prismaMock.creditTransaction.findMany.mockResolvedValue(mockCredits as any)
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockScreenTime as any)
      prismaMock.todoItem.findMany.mockResolvedValue(mockTodos as any)

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.children[0]).toEqual({
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
        chores: {
          completed: 1,
          assigned: 2,
          completionRate: '50.0',
        },
        credits: {
          earned: 50,
          spent: 30,
          net: 20,
        },
        screenTime: {
          used: 60,
          hours: 1,
          minutes: 0,
        },
        todos: {
          completed: 1,
          total: 1,
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate family report')
    })
  })
})
