import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/family-data/route'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/parent-configuration-lifecycle', () => {
  class MockParentConfigurationLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ParentConfigurationLifecycleError: MockParentConfigurationLifecycleError,
    isParentConfigurationLifecycleError: (error: unknown) =>
      error instanceof MockParentConfigurationLifecycleError,
    updateParentFamilyConfiguration: jest.fn(),
  }
})

const {
  ParentConfigurationLifecycleError,
  updateParentFamilyConfiguration: mockUpdateParentFamilyConfiguration,
} = jest.requireMock('@/lib/data/parent-configuration-lifecycle')

describe('/api/family-data PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates family settings updates to Parent Configuration Lifecycle', async () => {
    mockUpdateParentFamilyConfiguration.mockResolvedValue({
      id: 'family-1',
      name: 'Updated Family',
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/family-data', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Family',
          plannedMealTypes: ['BREAKFAST', 'DINNER'],
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockUpdateParentFamilyConfiguration).toHaveBeenCalledWith({
      name: 'Updated Family',
      plannedMealTypes: ['BREAKFAST', 'DINNER'],
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockUpdateParentFamilyConfiguration.mockRejectedValue(
      new ParentConfigurationLifecycleError(403, 'Parent access required')
    )

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/family-data', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Nope' }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Parent access required')
  })
})
