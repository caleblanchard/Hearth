// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// Mock data layer
jest.mock('@/lib/data/chores', () => ({
  completeChore: jest.fn(),
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
import { POST } from '@/app/api/chores/[id]/complete/route'
import { completeChore } from '@/lib/data/chores'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

describe('/api/chores/[id]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const choreInstanceId = 'chore-instance-1'
    const mockChoreInstance = {
      id: choreInstanceId,
      assignedToId: 'child-1',
      status: ChoreStatus.PENDING,
      choreSchedule: {
        requiresApproval: false,
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
          creditValue: 10,
        },
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if chore instance not found or completion fails', async () => {
      const session = mockChildSession()

      ;(completeChore as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Chore not found',
      })

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Chore not found')
    })

    it('should complete chore successfully', async () => {
      const session = mockParentSession()

      ;(completeChore as jest.Mock).mockResolvedValue({
        success: true,
        completion: {
          ...mockChoreInstance,
          status: ChoreStatus.APPROVED,
          completedAt: new Date().toISOString(),
          completedById: session.user.id,
        },
        credits_awarded: 10,
      })

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Test notes' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Chore completed successfully')
      
      expect(completeChore).toHaveBeenCalledWith(choreInstanceId, session.user.id, 'Test notes')
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores/123/complete', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })
  })
})
