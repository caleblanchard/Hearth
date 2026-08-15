import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/screen-time-lifecycle', () => {
  class MockScreenTimeLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ScreenTimeLifecycleError: MockScreenTimeLifecycleError,
    isScreenTimeLifecycleError: (error: unknown) =>
      error instanceof MockScreenTimeLifecycleError,
    listScreenTimeLifecycleTypes: jest.fn(),
    createScreenTimeLifecycleType: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  listScreenTimeLifecycleTypes: mockListScreenTimeLifecycleTypes,
  createScreenTimeLifecycleType: mockCreateScreenTimeLifecycleType,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { GET, POST } = require('@/app/api/screentime/types/route')

describe('/api/screentime/types route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates screen time type reads to Screen Time Lifecycle', async () => {
    mockListScreenTimeLifecycleTypes.mockResolvedValue({
      types: [
        {
          id: 'type-1',
          familyId: 'family-1',
          name: 'Gaming',
          description: 'Games',
          isActive: true,
          isArchived: false,
        },
      ],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/types')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.types).toHaveLength(1)
    expect(mockListScreenTimeLifecycleTypes).toHaveBeenCalledWith()
  })

  it('delegates screen time type creation to Screen Time Lifecycle', async () => {
    mockCreateScreenTimeLifecycleType.mockResolvedValue({
      id: 'type-1',
      familyId: 'family-1',
      name: 'Gaming',
      description: 'Games',
      isActive: true,
      isArchived: false,
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Gaming',
          description: 'Games',
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockCreateScreenTimeLifecycleType).toHaveBeenCalledWith({
      name: 'Gaming',
      description: 'Games',
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockCreateScreenTimeLifecycleType.mockRejectedValue(
      new ScreenTimeLifecycleError(400, 'Name is required')
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
  })
})
