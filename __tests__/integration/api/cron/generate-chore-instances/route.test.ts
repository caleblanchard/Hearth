// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock chore-scheduler
jest.mock('@/lib/chore-scheduler', () => ({
  getNextDueDates: jest.fn(),
  getNextAssignee: jest.fn(),
  startOfDay: jest.fn((date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }),
  endOfDay: jest.fn((date) => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }),
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
import { GET, POST } from '@/app/api/cron/generate-chore-instances/route'
import { AssignmentType, Frequency } from '@/app/generated/prisma'

const { getNextDueDates, getNextAssignee } = require('@/lib/chore-scheduler')

describe('/api/cron/generate-chore-instances', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  describe('GET', () => {
    it('should allow request if CRON_SECRET is not set', async () => {
      delete process.env.CRON_SECRET

      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances')

      prismaMock.choreSchedule.findMany.mockResolvedValue([])

      const response = await GET(request)
      const data = await response.json()

      // When CRON_SECRET is not set, the route should proceed (for development)
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if authorization header is incorrect', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should generate instances for FIXED assignment type', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const mockSchedule = {
        id: 'schedule-1',
        frequency: Frequency.DAILY,
        assignmentType: AssignmentType.FIXED,
        dayOfWeek: null,
        assignments: [
          {
            memberId: 'child-1',
            member: { id: 'child-1' },
          },
        ],
        choreDefinition: {
          id: 'chore-def-1',
          isActive: true,
        },
      }

      const dueDates = [new Date('2024-01-01'), new Date('2024-01-02')]

      prismaMock.choreSchedule.findMany.mockResolvedValue([mockSchedule] as any)
      getNextDueDates.mockReturnValue(dueDates)
      prismaMock.choreInstance.findFirst
        .mockResolvedValueOnce(null) // First date - no instance exists
        .mockResolvedValueOnce(null) // Second date - no instance exists
      prismaMock.choreInstance.create.mockResolvedValue({} as any)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.instancesCreated).toBe(2)
      expect(data.summary.schedulesProcessed).toBe(1)
    })

    it('should skip existing instances', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const mockSchedule = {
        id: 'schedule-1',
        frequency: Frequency.DAILY,
        assignmentType: AssignmentType.FIXED,
        assignments: [
          {
            memberId: 'child-1',
            member: { id: 'child-1' },
          },
        ],
        choreDefinition: {
          id: 'chore-def-1',
          isActive: true,
        },
      }

      const dueDates = [new Date('2024-01-01')]

      prismaMock.choreSchedule.findMany.mockResolvedValue([mockSchedule] as any)
      getNextDueDates.mockReturnValue(dueDates)
      prismaMock.choreInstance.findFirst.mockResolvedValue({ id: 'existing-instance' } as any)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.instancesCreated).toBe(0)
      expect(data.summary.instancesSkipped).toBe(1)
    })

    it('should skip schedules with no assignments', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const mockSchedule = {
        id: 'schedule-1',
        frequency: Frequency.DAILY,
        assignmentType: AssignmentType.FIXED,
        assignments: [],
        choreDefinition: {
          id: 'chore-def-1',
          isActive: true,
        },
      }

      prismaMock.choreSchedule.findMany.mockResolvedValue([mockSchedule] as any)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.instancesCreated).toBe(0)
    })

    it('should handle ROTATING assignment type', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const mockSchedule = {
        id: 'schedule-1',
        frequency: Frequency.WEEKLY,
        assignmentType: AssignmentType.ROTATING,
        dayOfWeek: 1,
        assignments: [
          {
            memberId: 'child-1',
            member: { id: 'child-1' },
          },
          {
            memberId: 'child-2',
            member: { id: 'child-2' },
          },
        ],
        choreDefinition: {
          id: 'chore-def-1',
          isActive: true,
        },
      }

      const dueDates = [new Date('2024-01-01')]

      prismaMock.choreSchedule.findMany.mockResolvedValue([mockSchedule] as any)
      getNextDueDates.mockReturnValue(dueDates)
      prismaMock.choreInstance.findFirst
        .mockResolvedValueOnce(null) // No existing instance for this date
        .mockResolvedValueOnce({ assignedToId: 'child-1' } as any) // Last instance
      getNextAssignee.mockReturnValue('child-2')
      prismaMock.choreInstance.create.mockResolvedValue({} as any)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.instancesCreated).toBe(1)
    })

    it('should handle errors per schedule gracefully', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const mockSchedule = {
        id: 'schedule-1',
        frequency: Frequency.DAILY,
        assignmentType: AssignmentType.FIXED,
        assignments: [
          {
            memberId: 'child-1',
            member: { id: 'child-1' },
          },
        ],
        choreDefinition: {
          id: 'chore-def-1',
          isActive: true,
        },
      }

      prismaMock.choreSchedule.findMany.mockResolvedValue([mockSchedule] as any)
      getNextDueDates.mockImplementation(() => {
        throw new Error('Schedule error')
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.errors).toBe(1)
      expect(data.errors).toBeDefined()
    })

    it('should return 500 on critical error', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      prismaMock.choreSchedule.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate chore instances')
    })
  })

  describe('POST', () => {
    it('should delegate to GET handler', async () => {
      const request = new NextRequest('http://localhost/api/cron/generate-chore-instances', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      prismaMock.choreSchedule.findMany.mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
