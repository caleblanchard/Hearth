import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/settings/modules/route'

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
    listParentConfigurationModules: jest.fn(),
    updateParentConfigurationModule: jest.fn(),
  }
})

const {
  ParentConfigurationLifecycleError,
  listParentConfigurationModules: mockListParentConfigurationModules,
  updateParentConfigurationModule: mockUpdateParentConfigurationModule,
} = jest.requireMock('@/lib/data/parent-configuration-lifecycle')

describe('/api/settings/modules route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates module reads to Parent Configuration Lifecycle', async () => {
    mockListParentConfigurationModules.mockResolvedValue({
      modules: [{ moduleId: 'CHORES', name: 'Chores', category: 'Tasks', isEnabled: true }],
      categories: { Tasks: [{ moduleId: 'CHORES', name: 'Chores', category: 'Tasks', isEnabled: true }] },
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/settings/modules')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(mockListParentConfigurationModules).toHaveBeenCalledWith()
  })

  it('delegates module updates to Parent Configuration Lifecycle', async () => {
    mockUpdateParentConfigurationModule.mockResolvedValue({
      module_id: 'CHORES',
      is_enabled: false,
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/settings/modules', {
        method: 'PATCH',
        body: JSON.stringify({
          moduleId: 'CHORES',
          isEnabled: false,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockUpdateParentConfigurationModule).toHaveBeenCalledWith({
      moduleId: 'CHORES',
      isEnabled: false,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockListParentConfigurationModules.mockRejectedValue(
      new ParentConfigurationLifecycleError(403, 'Parent access required')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/settings/modules')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Parent access required')
  })
})
