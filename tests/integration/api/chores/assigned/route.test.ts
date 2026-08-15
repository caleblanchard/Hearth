// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

import { GET } from '@/app/api/chores/assigned/route'
import { mockChildSession } from '@/lib/test-utils/auth-mock'
import { ChoreStatus } from '@/lib/enums'

describe('/api/chores/assigned', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  it('should return 401 when unauthenticated', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return the current member assigned chores', async () => {
    mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

    dbMock.choreInstance.findMany.mockResolvedValue([
      {
        id: 'chore-1',
        assignedToId: 'child-1',
        dueDate: new Date().toISOString(),
        status: ChoreStatus.PENDING,
        notes: null,
        choreSchedule: {
          requiresApproval: true,
          choreDefinition: {
            name: 'Clean room',
            description: 'Pick up toys',
            creditValue: 15,
            difficulty: 'EASY',
          },
        },
      },
    ] as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.chores).toEqual([
      expect.objectContaining({
        id: 'chore-1',
        name: 'Clean room',
        creditValue: 15,
        requiresApproval: true,
        status: ChoreStatus.PENDING,
      }),
    ])
  })
})
