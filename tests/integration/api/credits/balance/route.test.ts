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

import { GET } from '@/app/api/credits/balance/route'
import { mockChildSession } from '@/lib/test-utils/auth-mock'

describe('/api/credits/balance', () => {
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

  it('should return the current member credit balance', async () => {
    mockChildSession({ user: { id: 'child-1', familyId: 'family-1' } })

    dbMock.creditBalance.findUnique.mockResolvedValue({
      memberId: 'child-1',
      currentBalance: 120,
      lifetimeEarned: 300,
      lifetimeSpent: 180,
    } as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.balance).toEqual({
      current: 120,
      lifetimeEarned: 300,
      lifetimeSpent: 180,
    })
  })
})
