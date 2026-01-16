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
import { GET } from '@/app/api/screentime/grace/pending/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RepaymentStatus } from '@/app/generated/prisma'

describe('/api/screentime/grace/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockPendingRequests = [
      {
        id: 'grace-1',
        memberId: 'child-1',
        minutesGranted: 30,
        reason: 'Extra time for homework',
        requestedAt: new Date('2024-01-01T10:00:00'),
        approvedById: null,
        repaymentStatus: RepaymentStatus.PENDING,
        member: {
          id: 'child-1',
          name: 'Child One',
        },
      },
      {
        id: 'grace-2',
        memberId: 'child-2',
        minutesGranted: 15,
        reason: 'Family movie night',
        requestedAt: new Date('2024-01-02T14:00:00'),
        approvedById: null,
        repaymentStatus: RepaymentStatus.PENDING,
        member: {
          id: 'child-2',
          name: 'Child Two',
        },
      },
    ]

    const mockBalance1 = {
      memberId: 'child-1',
      currentBalanceMinutes: 60,
      weekStartDate: new Date(),
    }

    const mockBalance2 = {
      memberId: 'child-2',
      currentBalanceMinutes: 45,
      weekStartDate: new Date(),
    }

    it('should return 401 if not authenticated', async () => {

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only parents can view pending grace requests')
    })

    it('should return pending grace requests for parent', async () => {
      const session = mockParentSession()

      prismaMock.gracePeriodLog.findMany.mockResolvedValue(mockPendingRequests as any)
      prismaMock.screenTimeBalance.findUnique
        .mockResolvedValueOnce(mockBalance1 as any)
        .mockResolvedValueOnce(mockBalance2 as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(2)
      expect(data.requests[0]).toEqual({
        id: 'grace-1',
        memberId: 'child-1',
        memberName: 'Child One',
        minutesGranted: 30,
        reason: 'Extra time for homework',
        requestedAt: mockPendingRequests[0].requestedAt.toISOString(),
        currentBalance: 60,
      })
      expect(data.requests[1]).toEqual({
        id: 'grace-2',
        memberId: 'child-2',
        memberName: 'Child Two',
        minutesGranted: 15,
        reason: 'Family movie night',
        requestedAt: mockPendingRequests[1].requestedAt.toISOString(),
        currentBalance: 45,
      })

      expect(prismaMock.gracePeriodLog.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: session.user.familyId,
          },
          approvedById: null,
          repaymentStatus: 'PENDING',
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
          requestedAt: 'asc',
        },
      })
    })

    it('should handle members without balance', async () => {
      const session = mockParentSession()

      prismaMock.gracePeriodLog.findMany.mockResolvedValue(mockPendingRequests as any)
      prismaMock.screenTimeBalance.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBalance2 as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests[0].currentBalance).toBe(0)
      expect(data.requests[1].currentBalance).toBe(45)
    })

    it('should return empty array if no pending requests', async () => {
      const session = mockParentSession()

      prismaMock.gracePeriodLog.findMany.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toEqual([])
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.gracePeriodLog.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch pending grace requests')
    })
  })
})
