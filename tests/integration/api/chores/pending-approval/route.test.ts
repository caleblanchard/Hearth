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
import { GET } from '@/app/api/chores/pending-approval/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

describe('/api/chores/pending-approval', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    const mockPendingChores = [
      {
        id: 'chore-instance-1',
        status: ChoreStatus.COMPLETED,
        completedAt: new Date('2024-01-01'),
        notes: 'Completed notes',
        photoUrl: null,
        choreSchedule: {
          choreDefinition: {
            id: 'chore-def-1',
            name: 'Test Chore',
            description: 'Test description',
            creditValue: 10,
            difficulty: 'MEDIUM',
          },
        },
        assignedTo: {
          id: 'child-1',
          name: 'Child One',
          avatarUrl: null,
        },
        completedBy: {
          id: 'child-1',
          name: 'Child One',
        },
      },
    ]

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
      expect(data.error).toBe('Forbidden - Parent access required')
    })

    it('should return pending chores for parent', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findMany.mockResolvedValue(mockPendingChores as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toHaveLength(1)
      expect(data.chores[0]).toEqual(mockPendingChores[0])

      expect(dbMock.choreInstance.findMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
        },
        include: {
          assignment: {
            include: {
              schedule: {
                include: {
                  definition: {
                    select: {
                      creditValue: true,
                      familyId: true,
                      name: true,
                    },
                  },
                },
              },
            },
            where: {
              schedule: {
                definition: {
                  familyId: session.user.familyId,
                },
              },
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          completedAt: 'asc',
        },
      })
    })

    it('should return empty array if no pending chores', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findMany.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chores).toEqual([])
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      dbMock.choreInstance.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch pending approvals')
    })
  })
})
