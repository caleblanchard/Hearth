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
import { GET, POST } from '@/app/api/financial/savings-goals/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/financial/savings-goals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockGoals = [
      {
        id: 'goal-1',
        memberId: 'child-1',
        name: 'New Bike',
        description: 'Save for a new bike',
        targetAmount: 5000,
        currentAmount: 2000,
        iconName: 'bike',
        color: 'blue',
        deadline: new Date('2024-12-31'),
        member: {
          id: 'child-1',
          name: 'Child One',
        },
      },
    ]

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/financial/savings-goals')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return goals for child (own goals only)', async () => {
      const session = mockChildSession()

      prismaMock.savingsGoal.findMany.mockResolvedValue(mockGoals as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.goals).toEqual(mockGoals)

      expect(prismaMock.savingsGoal.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          memberId: session.user.id,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return goals for parent (all family goals)', async () => {
      const session = mockParentSession()

      prismaMock.savingsGoal.findMany.mockResolvedValue(mockGoals as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.goals).toEqual(mockGoals)

      expect(prismaMock.savingsGoal.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.savingsGoal.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch savings goals')
    })
  })

  describe('POST', () => {
    const mockGoal = {
      id: 'goal-1',
      memberId: 'child-1',
      name: 'New Bike',
      description: 'Save for a new bike',
      targetAmount: 5000,
      currentAmount: 0,
      iconName: 'bike',
      color: 'blue',
      deadline: new Date('2024-12-31'),
      member: {
        id: 'child-1',
        name: 'Child One',
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is missing', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if name is empty', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: '   ',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if targetAmount is invalid', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: -100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Target amount must be positive')
    })

    it('should return 400 if targetAmount is zero', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Target amount must be positive')
    })

    it('should return 400 if memberId is missing for parent', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID is required')
    })

    it('should create goal for child (using own ID)', async () => {
      const session = mockChildSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: session.user.id,
        familyId: session.user.familyId,
      } as any)

      prismaMock.savingsGoal.create.mockResolvedValue(mockGoal as any)

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Bike',
          targetAmount: 5000,
          description: 'Save for a new bike',
          iconName: 'bike',
          color: 'blue',
          deadline: '2024-12-31',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.goal).toEqual(mockGoal)
      expect(data.message).toBe('Savings goal created successfully')

      expect(prismaMock.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          memberId: session.user.id,
          name: 'New Bike',
          description: 'Save for a new bike',
          targetAmount: 5000,
          iconName: 'bike',
          color: 'blue',
          deadline: new Date('2024-12-31'),
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

    it('should create goal for parent (specified memberId)', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.savingsGoal.create.mockResolvedValue(mockGoal as any)

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)

      expect(prismaMock.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        select: { familyId: true },
      })

      expect(prismaMock.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-1',
          name: 'New Bike',
          description: null,
          targetAmount: 5000,
          iconName: 'currency-dollar',
          color: 'blue',
          deadline: null,
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

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'invalid-id',
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should return 404 if member belongs to different family', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.savingsGoal.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/financial/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          name: 'New Bike',
          targetAmount: 5000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create savings goal')
    })
  })
})
