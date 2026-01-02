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
import { DELETE } from '@/app/api/todos/clear-completed/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/todos/clear-completed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should clear completed todos for family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.deleteMany.mockResolvedValue({ count: 5 })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(5)
      expect(data.message).toBe('5 completed tasks cleared')

      expect(prismaMock.todoItem.deleteMany).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          status: 'COMPLETED',
        },
      })
    })

    it('should handle singular message correctly', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.deleteMany.mockResolvedValue({ count: 1 })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('1 completed task cleared')
    })

    it('should handle zero completed todos', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.deleteMany.mockResolvedValue({ count: 0 })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(0)
      expect(data.message).toBe('0 completed tasks cleared')
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.deleteMany.mockRejectedValue(new Error('Database error'))

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to clear completed todos')
    })
  })
})
