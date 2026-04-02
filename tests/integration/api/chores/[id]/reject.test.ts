// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// Mock data layer
jest.mock('@/lib/data/chores', () => ({
  rejectChore: jest.fn(),
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
import { POST } from '@/app/api/chores/[id]/reject/route'
import { rejectChore } from '@/lib/data/chores'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

describe('/api/chores/[id]/reject', () => {
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
      notes: 'Original notes',
      choreSchedule: {
        choreDefinition: {
          id: 'chore-def-1',
          name: 'Test Chore',
        },
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Parent access required')
    })

    it('should return 500 if chore instance not found (update fails)', async () => {
      const session = mockParentSession()

      ;(rejectChore as jest.Mock).mockRejectedValue(new Error('Chore not found'))

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reject chore')
    })

    it('should reject chore with reason', async () => {
      const session = mockParentSession()

      ;(rejectChore as jest.Mock).mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: 'Not done well',
      })

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Not done well' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('rejected')
      
      expect(rejectChore).toHaveBeenCalledWith(choreInstanceId, session.user.id, 'Not done well')
    })

    it('should use empty reason if not provided', async () => {
      const session = mockParentSession()

      ;(rejectChore as jest.Mock).mockResolvedValue({
        ...mockChoreInstance,
        status: ChoreStatus.REJECTED,
      })

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })

      expect(rejectChore).toHaveBeenCalledWith(choreInstanceId, session.user.id, '')
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/chores/123/reject', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request, { params: Promise.resolve({ id: choreInstanceId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reject chore')
    })
  })
})
