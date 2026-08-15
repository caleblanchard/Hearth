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

// Mock screentime-utils (for dynamic import in dashboard route)
jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: jest.fn(),
  getWeekStart: jest.fn(),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/dashboard/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus, TodoStatus } from '@/lib/enums'

const { calculateRemainingTime } = require('@/lib/screentime-utils')

describe('/api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return a dashboard snapshot for a child viewer', async () => {
      mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

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
          { id: 'item-1', name: 'Milk', quantity: 1, unit: 'gallon', priority: 'URGENT', status: 'PENDING' },
          { id: 'item-2', name: 'Bread', quantity: 2, unit: 'loaf', priority: 'NORMAL', status: 'PENDING' },
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
          title: 'Assigned Event',
          startTime: tomorrow,
          endTime: tomorrow,
          location: 'Home',
          color: 'blue',
          assignments: [{ memberId: 'child-1' }],
        },
      ]

      const mockProjectTasks = [
        {
          id: 'task-1',
          name: 'Fix fence',
          description: 'Backyard repair',
          status: 'IN_PROGRESS',
          dueDate: tomorrow,
          projectId: 'project-1',
          project: {
            id: 'project-1',
            name: 'Home upkeep',
            familyId: 'family-1',
          },
        },
      ]

      dbMock.choreInstance.findMany.mockResolvedValue(mockChores as any)
      dbMock.screenTimeBalance.findUnique.mockResolvedValue(mockScreenTime as any)
      dbMock.creditBalance.findUnique.mockResolvedValue(mockCreditBalance as any)
      dbMock.shoppingList.findMany.mockResolvedValue([mockShoppingList] as any)
      dbMock.todoItem.findMany.mockResolvedValue(mockTodos as any)
      dbMock.calendarEvent.findMany.mockResolvedValue(mockEvents as any)
      dbMock.projectTask.findMany.mockResolvedValue(mockProjectTasks as any)
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([
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
      expect(data.partial).toBe(false)
      expect(data.cards).toEqual(expect.any(Array))

      const choresCard = data.cards.find((card: any) => card.kind === 'chores')
      expect(choresCard).toMatchObject({
        kind: 'chores',
        title: "Today's Chores",
        state: 'ready',
        badge: { label: '0/1' },
        preview: [
          expect.objectContaining({
            id: 'chore-1',
            primary: 'Test Chore',
            secondary: '+10 credits',
            meta: 'pending',
          }),
        ],
        moreCount: 0,
      })

      const screenTimeCard = data.cards.find((card: any) => card.kind === 'screentime')
      expect(screenTimeCard).toMatchObject({
        kind: 'screentime',
        state: 'ready',
        badge: { label: '60 min' },
        preview: [
          expect.objectContaining({
            id: 'allowance-1',
            primary: 'Educational',
            secondary: '60m remaining',
          }),
        ],
      })

      const creditsCard = data.cards.find((card: any) => card.kind === 'credits')
      expect(creditsCard).toMatchObject({
        kind: 'credits',
        state: 'ready',
        badge: { label: '100' },
        summary: expect.arrayContaining([
          { label: 'Current Balance', value: '100 credits' },
          { label: 'Lifetime Earned', value: '200' },
          { label: 'Lifetime Spent', value: '100' },
        ]),
      })

      const calendarCard = data.cards.find((card: any) => card.kind === 'calendar')
      expect(calendarCard).toMatchObject({
        kind: 'calendar',
        state: 'ready',
        preview: [
          expect.objectContaining({
            id: 'event-1',
            primary: 'Assigned Event',
            secondary: expect.stringContaining(new Date(tomorrow).toLocaleDateString()),
          }),
        ],
      })
    })

    it('should filter calendar preview to assigned events for children', async () => {
      mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

      dbMock.choreInstance.findMany.mockResolvedValue([])
      dbMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      dbMock.creditBalance.findUnique.mockResolvedValue(null)
      dbMock.shoppingList.findMany.mockResolvedValue([])
      dbMock.todoItem.findMany.mockResolvedValue([])
      dbMock.projectTask.findMany.mockResolvedValue([])
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([])

      dbMock.calendarEvent.findMany.mockResolvedValue([
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
      ] as any)

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      const calendarCard = data.cards.find((card: any) => card.kind === 'calendar')
      expect(calendarCard.preview).toHaveLength(1)
      expect(calendarCard.preview[0].id).toBe('event-1')
    })

    it('should degrade to a partial snapshot when one card fails', async () => {
      mockParentSession({ user: { id: 'parent-1', familyId: 'family-1' } })

      dbMock.choreInstance.findMany.mockRejectedValue(new Error('Database error'))
      dbMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      dbMock.creditBalance.findUnique.mockResolvedValue(null)
      dbMock.shoppingList.findMany.mockResolvedValue([])
      dbMock.todoItem.findMany.mockResolvedValue([])
      dbMock.calendarEvent.findMany.mockResolvedValue([])
      dbMock.projectTask.findMany.mockResolvedValue([])
      dbMock.screenTimeAllowance.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.partial).toBe(true)
      expect(data.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'chores',
            code: 'source-unavailable',
          }),
        ])
      )

      const choresCard = data.cards.find((card: any) => card.kind === 'chores')
      expect(choresCard).toMatchObject({
        kind: 'chores',
        state: 'unavailable',
      })
    })
  })
})
