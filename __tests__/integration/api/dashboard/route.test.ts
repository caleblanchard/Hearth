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

// Mock screentime-utils (for dynamic import in dashboard route)
jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: jest.fn(),
  getWeekStart: jest.fn(),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/dashboard/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus, TodoStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')
const { calculateRemainingTime } = require('@/lib/screentime-utils')

describe('/api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return dashboard data for child', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      const mockChores = [
        {
          id: 'chore-1',
          assignedToId: 'child-1',
          dueDate: today,
          status: ChoreStatus.PENDING,
          choreSchedule: {
            choreDefinition: {
              name: 'Test Chore',
              description: 'Test description',
              creditValue: 10,
              difficulty: 'MEDIUM',
            },
            requiresApproval: false,
          },
        },
      ]

      const mockScreenTime = {
        memberId: 'child-1',
        currentBalanceMinutes: 60,
        weekStartDate: today,
        member: {
          screenTimeSettings: {
            weeklyAllocationMinutes: 120,
          },
        },
      }

      const mockCreditBalance = {
        memberId: 'child-1',
        currentBalance: 100,
        lifetimeEarned: 200,
        lifetimeSpent: 100,
      }

      const mockShoppingList = {
        id: 'list-1',
        name: 'Grocery List',
        items: [
          { id: 'item-1', priority: 'URGENT', status: 'PENDING' },
          { id: 'item-2', priority: 'NORMAL', status: 'PENDING' },
        ],
      }

      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Test Todo',
          priority: 'HIGH',
          dueDate: tomorrow,
          status: TodoStatus.PENDING,
        },
      ]

      const mockEvents = [
        {
          id: 'event-1',
          title: 'Test Event',
          startTime: tomorrow,
          endTime: tomorrow,
          location: null,
          color: 'blue',
          assignments: [{ memberId: 'child-1' }],
        },
      ]

      prismaMock.choreInstance.findMany.mockResolvedValue(mockChores as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockScreenTime as any)
      prismaMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      prismaMock.shoppingList.findMany.mockResolvedValue([mockShoppingList] as any)
      prismaMock.todoItem.findMany.mockResolvedValue(mockTodos as any)
      prismaMock.calendarEvent.findMany.mockResolvedValue(mockEvents as any)
      prismaMock.projectTask.findMany.mockResolvedValue([])
      
      // Mock screen time allowances and calculateRemainingTime
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([
        {
          id: 'allowance-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          screenTimeType: {
            id: 'type-1',
            name: 'Educational',
            description: 'Educational apps',
          },
        },
      ] as any)
      
      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: today,
        periodEnd: tomorrow,
      })
      
      // Mock screen time allowances and calculateRemainingTime
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([
        {
          id: 'allowance-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          screenTimeType: {
            id: 'type-1',
            name: 'Educational',
            description: 'Educational apps',
          },
        },
      ] as any)
      
      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: today,
        periodEnd: tomorrow,
      })

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toHaveLength(1)
      expect(data.screenTime).toEqual({
        currentBalance: 60,
        weeklyAllocation: 120,
        weekStartDate: today,
        allowances: expect.arrayContaining([
          expect.objectContaining({
            screenTimeTypeId: 'type-1',
            screenTimeTypeName: 'Educational',
            allowanceMinutes: 120,
            remainingMinutes: 60,
          }),
        ]),
      })
      expect(data.credits).toEqual({
        current: 100,
        lifetimeEarned: 200,
        lifetimeSpent: 100,
      })
      expect(data.shopping).toEqual({
        id: 'list-1',
        name: 'Grocery List',
        itemCount: 2,
        urgentCount: 1,
        items: expect.any(Array),
      })
      expect(data.todos).toHaveLength(1)
      expect(data.events).toHaveLength(1)
    })

    it('should return dashboard data for parent', async () => {
      const session = mockParentSession({ user: { id: 'parent-1', familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findMany.mockResolvedValue([])
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      prismaMock.creditBalance.findUnique.mockResolvedValue(null)
      prismaMock.shoppingList.findMany.mockResolvedValue([])
      prismaMock.todoItem.findMany.mockResolvedValue([])
      prismaMock.calendarEvent.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toEqual([])
      expect(data.screenTime).toBeNull()
      expect(data.credits).toBeNull()
      expect(data.shopping).toBeNull()
      expect(data.todos).toEqual([])
      expect(data.events).toEqual([])
    })

    it('should filter events for child (only assigned)', async () => {
      const session = mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findMany.mockResolvedValue([])
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      prismaMock.creditBalance.findUnique.mockResolvedValue(null)
      prismaMock.shoppingList.findMany.mockResolvedValue([])
      prismaMock.todoItem.findMany.mockResolvedValue([])
      prismaMock.projectTask.findMany.mockResolvedValue([])

      const mockEvents = [
        {
          id: 'event-1',
          title: 'Assigned Event',
          startTime: tomorrow,
          endTime: tomorrow,
          location: null,
          color: 'blue',
          assignments: [{ memberId: 'child-1' }],
        },
        {
          id: 'event-2',
          title: 'Unassigned Event',
          startTime: tomorrow,
          endTime: tomorrow,
          location: null,
          color: 'red',
          assignments: [],
        },
      ]

      prismaMock.calendarEvent.findMany.mockResolvedValue(mockEvents as any)
      
      // Mock screen time allowances (empty for this test)
      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Child should only see assigned events
      expect(data.events).toHaveLength(1)
      expect(data.events[0].id).toBe('event-1')
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.choreInstance.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch dashboard data')
    })
  })
})
