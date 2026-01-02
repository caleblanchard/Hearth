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
import { GET } from '@/app/api/screentime/family/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { Role } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/screentime/family', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return family screen time overview for parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockMembers = [
        {
          id: 'child-1',
          name: 'Child One',
          avatarUrl: null,
          role: Role.CHILD,
        },
        {
          id: 'child-2',
          name: 'Child Two',
          avatarUrl: null,
          role: Role.CHILD,
        },
      ]

      const mockBalance1 = {
        memberId: 'child-1',
        currentBalanceMinutes: 60,
        weekStartDate: new Date('2024-01-01'),
      }

      const mockSettings1 = {
        memberId: 'child-1',
        weeklyAllocationMinutes: 120,
      }

      const mockTransactions1 = [
        { amountMinutes: -30 },
        { amountMinutes: -20 },
      ]

      const mockBalance2 = {
        memberId: 'child-2',
        currentBalanceMinutes: 45,
        weekStartDate: new Date('2024-01-01'),
      }

      const mockSettings2 = {
        memberId: 'child-2',
        weeklyAllocationMinutes: 100,
      }

      const mockTransactions2 = [
        { amountMinutes: -15 },
      ]

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.screenTimeBalance.findUnique
        .mockResolvedValueOnce(mockBalance1 as any)
        .mockResolvedValueOnce(mockBalance2 as any)
      prismaMock.screenTimeSettings.findUnique
        .mockResolvedValueOnce(mockSettings1 as any)
        .mockResolvedValueOnce(mockSettings2 as any)
      prismaMock.screenTimeTransaction.findMany
        .mockResolvedValueOnce(mockTransactions1 as any)
        .mockResolvedValueOnce(mockTransactions2 as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(2)
      expect(data.members[0]).toEqual({
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
        role: Role.CHILD,
        currentBalance: 60,
        weeklyAllocation: 120,
        weeklyUsage: 50, // 30 + 20
        weekStartDate: mockBalance1.weekStartDate,
      })
      expect(data.members[1]).toEqual({
        id: 'child-2',
        name: 'Child Two',
        avatarUrl: null,
        role: Role.CHILD,
        currentBalance: 45,
        weeklyAllocation: 100,
        weeklyUsage: 15,
        weekStartDate: mockBalance2.weekStartDate,
      })

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          isActive: true,
          role: { not: 'PARENT' },
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
        },
      })
    })

    it('should handle members without balance or settings', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockMembers = [
        {
          id: 'child-1',
          name: 'Child One',
          avatarUrl: null,
          role: Role.CHILD,
        },
      ]

      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      prismaMock.screenTimeSettings.findUnique.mockResolvedValue(null)
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members[0]).toEqual({
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
        role: Role.CHILD,
        currentBalance: 0,
        weeklyAllocation: 0,
        weeklyUsage: 0,
        weekStartDate: undefined,
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch family screen time')
    })
  })
})
