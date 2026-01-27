// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// Mock achievements
jest.mock('@/lib/achievements', () => ({
  checkAndAwardAchievement: jest.fn(),
  updateStreak: jest.fn(),
}))

// Mock data layer
jest.mock('@/lib/data/chores', () => ({
  approveChore: jest.fn(),
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
import { POST } from '@/app/api/chores/[id]/approve/route'
import { approveChore } from '@/lib/data/chores'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

const { checkAndAwardAchievement, updateStreak } = require('@/lib/achievements')

describe('/api/chores/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const choreInstanceId = 'chore-instance-1'
    const mockChoreInstance = {
      id: choreInstanceId,
      assignedToId: 'child-1',
      status: ChoreStatus.COMPLETED,
      choreSchedule: {
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
          creditValue: 10,
        },
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Parent access required')
    })

    it('should return 400 if chore instance not found or approval fails', async () => {
      const session = mockParentSession()

      ;(approveChore as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Chore not found',
      })

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Chore not found')
    })

    it('should approve chore successfully', async () => {
      const session = mockParentSession()

      ;(approveChore as jest.Mock).mockResolvedValue({
        success: true,
        completion: {
          ...mockChoreInstance,
          status: ChoreStatus.APPROVED,
          approved_at: new Date().toISOString(),
          approved_by_id: session.user.id,
        },
        credits_awarded: 10,
      })

      const request = new NextRequest('http://localhost/api/chores/123/approve', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('approved')
      expect(data.creditsAwarded).toBe(10)
      
      expect(approveChore).toHaveBeenCalledWith(choreInstanceId, session.user.id)
    })
  })
})
