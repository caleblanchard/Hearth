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

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/reports/family/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus, TodoStatus, CreditTransactionType, ScreenTimeTransactionType } from '@/lib/enums'

describe('/api/reports/family', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    const mockMembers = [
      {
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
      },
    ]

    const mockChoreCompletions = [
      {
        id: 'chore-1',
        completedBy: 'child-1',
        status: 'APPROVED',
        creditsAwarded: 50,
        completedAt: new Date('2024-01-01T10:00:00Z'),
        definition: { title: 'Wash Dishes' },
      },
    ]

    const mockRewardRedemptions = [
      {
        id: 'reward-1',
        redeemedBy: 'child-1',
        status: 'APPROVED',
        creditsCost: 30,
        redeemedAt: new Date('2024-01-02T10:00:00Z'),
        item: { name: 'Ice Cream' },
      },
    ]

    const mockRoutineCompletions = [
      {
        id: 'routine-1',
        completedBy: 'child-1',
        completedAt: new Date('2024-01-01T08:00:00Z'),
        routine: { name: 'Morning Routine' },
      },
    ]

    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      
      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should generate report for week period', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      // Mapped to choreInstance via override
      dbMock.choreInstance.findMany.mockResolvedValue(mockChoreCompletions as any)
      dbMock.rewardRedemption.findMany.mockResolvedValue(mockRewardRedemptions as any)
      dbMock.routineCompletion.findMany.mockResolvedValue(mockRoutineCompletions as any)
      dbMock.communicationPost.findMany.mockResolvedValue([] as any)
      dbMock.notification.findMany.mockResolvedValue([] as any)

      const request = new NextRequest('http://localhost/api/reports/family?period=week')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.report.period.type).toBe('week')
      expect(data.report.family.totalMembers).toBe(1)
      expect(data.report.family.totalChoresCompleted).toBe(1)
      expect(data.report.family.totalCreditsEarned).toBe(50)
      expect(data.report.family.totalCreditsSpent).toBe(30)
      expect(data.report.family.totalRoutinesCompleted).toBe(1)
      expect(data.report.members).toHaveLength(1)
      expect(data.report.members[0].stats.choresCompleted).toBe(1)
      expect(data.report.members[0].stats.creditsEarned).toBe(50)
    })

    it('should generate report for custom date range', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      dbMock.choreInstance.findMany.mockResolvedValue([])
      dbMock.rewardRedemption.findMany.mockResolvedValue([])
      dbMock.routineCompletion.findMany.mockResolvedValue([])
      dbMock.communicationPost.findMany.mockResolvedValue([])
      dbMock.notification.findMany.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/reports/family?period=custom&startDate=2024-01-01&endDate=2024-01-31'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.report.period.type).toBe('custom')
      expect(data.report.period.start).toBeDefined()
      expect(data.report.period.end).toBeDefined()
    })

    it('should calculate per-child breakdown', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findMany.mockResolvedValue(mockMembers as any)
      dbMock.choreInstance.findMany.mockResolvedValue(mockChoreCompletions as any)
      dbMock.rewardRedemption.findMany.mockResolvedValue(mockRewardRedemptions as any)
      dbMock.routineCompletion.findMany.mockResolvedValue(mockRoutineCompletions as any)
      dbMock.communicationPost.findMany.mockResolvedValue([] as any)
      dbMock.notification.findMany.mockResolvedValue([] as any)

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.report.members[0]).toMatchObject({
        memberId: 'child-1',
        name: 'Child One',
        stats: {
          choresCompleted: 1,
          creditsEarned: 50,
          creditsSpent: 30,
          routinesCompleted: 1,
        }
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/reports/family')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get family report')
    })
  })
})
