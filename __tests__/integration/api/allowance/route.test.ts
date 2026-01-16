// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/allowance/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { Frequency } from '@/app/generated/prisma'

describe('/api/allowance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return allowance schedules for authenticated user', async () => {
      const session = mockParentSession()

      const mockSchedules = [
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
          createdAt: new Date(),
          updatedAt: new Date(),
          member: {
            id: 'child-1',
            name: 'Child 1',
            email: null,
          },
        },
      ]

      prismaMock.allowanceSchedule.findMany.mockResolvedValue(mockSchedules as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedules).toEqual(mockSchedules)
      expect(prismaMock.allowanceSchedule.findMany).toHaveBeenCalledWith({
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
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should only return schedules from user family', async () => {
      const session = mockParentSession({ user: { ...mockParentSession().user, familyId: 'family-123' } })

      prismaMock.allowanceSchedule.findMany.mockResolvedValue([])

      await GET()

      expect(prismaMock.allowanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            member: {
              familyId: 'family-123',
            },
          },
        })
      )
    })

    it('should handle database errors', async () => {
      prismaMock.allowanceSchedule.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch allowance schedules')
    })
  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should validate required fields', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          // Missing memberId
          amount: 500,
          frequency: 'WEEKLY',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should validate amount is positive', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: -100,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('positive')
    })

    it('should validate dayOfWeek for WEEKLY frequency', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          // Missing dayOfWeek
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('dayOfWeek')
    })

    it('should validate dayOfMonth for MONTHLY frequency', async () => {

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'MONTHLY',
          // Missing dayOfMonth
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('dayOfMonth')
    })

    it('should verify member belongs to same family', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'different-family-child',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should prevent duplicate active schedules for same member', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.allowanceSchedule.findFirst.mockResolvedValue({
        id: 'existing-schedule',
        memberId: 'child-1',
        isActive: true,
      } as any)

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already has an active allowance schedule')
    })

    it('should create weekly allowance schedule successfully', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
        name: 'Child 1',
      } as any)

      prismaMock.allowanceSchedule.findFirst.mockResolvedValue(null)

      const mockSchedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 500,
        frequency: Frequency.WEEKLY,
        dayOfWeek: 0,
        dayOfMonth: null,
        isActive: true,
        isPaused: false,
        startDate: new Date(),
        endDate: null,
        lastProcessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        member: {
          id: 'child-1',
          name: 'Child 1',
        },
      }

      prismaMock.allowanceSchedule.create.mockResolvedValue(mockSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.schedule).toEqual(mockSchedule)
      expect(prismaMock.allowanceSchedule.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
          dayOfMonth: null,
          isActive: true,
          isPaused: false,
          startDate: expect.any(Date),
          endDate: null,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    })

    it('should create monthly allowance schedule successfully', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.allowanceSchedule.findFirst.mockResolvedValue(null)

      const mockSchedule = {
        id: 'schedule-1',
        memberId: 'child-1',
        amount: 2000,
        frequency: Frequency.MONTHLY,
        dayOfWeek: null,
        dayOfMonth: 15,
        isActive: true,
        isPaused: false,
      }

      prismaMock.allowanceSchedule.create.mockResolvedValue(mockSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 2000,
          frequency: 'MONTHLY',
          dayOfMonth: 15,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(prismaMock.allowanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            frequency: 'MONTHLY',
            dayOfMonth: 15,
            dayOfWeek: null,
          }),
        })
      )
    })

    it('should handle optional startDate and endDate', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.allowanceSchedule.findFirst.mockResolvedValue(null)
      prismaMock.allowanceSchedule.create.mockResolvedValue({} as any)

      const startDate = '2025-02-01T00:00:00Z'
      const endDate = '2025-12-31T00:00:00Z'

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
          startDate,
          endDate,
        }),
      })

      await POST(request)

      expect(prismaMock.allowanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }),
        })
      )
    })

    it('should handle database errors', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.allowanceSchedule.findFirst.mockResolvedValue(null)
      prismaMock.allowanceSchedule.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 500,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create allowance schedule')
    })
  })
})
