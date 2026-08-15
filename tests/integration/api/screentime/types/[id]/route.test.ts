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
    getScreenTimeLifecycleType: jest.fn(),
    updateScreenTimeLifecycleType: jest.fn(),
    archiveScreenTimeLifecycleType: jest.fn(),
  }
})

const {
  ScreenTimeLifecycleError,
  getScreenTimeLifecycleType: mockGetScreenTimeLifecycleType,
  updateScreenTimeLifecycleType: mockUpdateScreenTimeLifecycleType,
  archiveScreenTimeLifecycleType: mockArchiveScreenTimeLifecycleType,
} = jest.requireMock('@/lib/data/screen-time-lifecycle')
const { DELETE, GET, PATCH } = require('@/app/api/screentime/types/[id]/route')

describe('/api/screentime/types/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates single type reads to Screen Time Lifecycle', async () => {
    mockGetScreenTimeLifecycleType.mockResolvedValue({
      id: 'type-1',
      familyId: 'family-1',
      name: 'Educational',
      description: 'Educational content',
      isActive: true,
      isArchived: false,
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/types/type-1'),
      { params: Promise.resolve({ id: 'type-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.type.name).toBe('Educational')
    expect(mockGetScreenTimeLifecycleType).toHaveBeenCalledWith('type-1')
  })

  it('delegates type updates to Screen Time Lifecycle', async () => {
    mockUpdateScreenTimeLifecycleType.mockResolvedValue({
      id: 'type-1',
      familyId: 'family-1',
      name: 'Updated Name',
      description: null,
      isActive: true,
      isArchived: false,
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }),
      { params: Promise.resolve({ id: 'type-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.type.name).toBe('Updated Name')
    expect(mockUpdateScreenTimeLifecycleType).toHaveBeenCalledWith('type-1', {
      name: 'Updated Name',
    })
  })

  it('delegates type archiving to Screen Time Lifecycle', async () => {
    mockArchiveScreenTimeLifecycleType.mockResolvedValue(undefined)

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/screentime/types/type-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'type-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockArchiveScreenTimeLifecycleType).toHaveBeenCalledWith('type-1')
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetScreenTimeLifecycleType.mockRejectedValue(
      new ScreenTimeLifecycleError(404, 'Screen time type not found')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/screentime/types/missing'),
      { params: Promise.resolve({ id: 'missing' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Screen time type not found')
  })
})
