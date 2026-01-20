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
import { GET } from '@/app/api/children/route'

describe('/api/children', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    const mockChildren = [
      {
        id: 'child-1',
        name: 'Child One',
        avatarUrl: null,
      },
      {
        id: 'child-2',
        name: 'Child Two',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    ]

    it('should return all active children', async () => {
      dbMock.familyMember.findMany.mockResolvedValue(mockChildren as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockChildren)

      expect(dbMock.familyMember.findMany).toHaveBeenCalledWith({
        where: {
          role: 'CHILD',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    })

    it('should return empty array if no children', async () => {
      dbMock.familyMember.findMany.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 500 on error', async () => {
      dbMock.familyMember.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch children')
    })
  })
})
