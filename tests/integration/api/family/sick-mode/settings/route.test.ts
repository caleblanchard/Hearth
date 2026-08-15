import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/family/sick-mode/settings/route'

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
    getFamilySickModeConfiguration: jest.fn(),
    updateFamilySickModeConfiguration: jest.fn(),
  }
})

const {
  ParentConfigurationLifecycleError,
  getFamilySickModeConfiguration: mockGetFamilySickModeConfiguration,
  updateFamilySickModeConfiguration: mockUpdateFamilySickModeConfiguration,
} = jest.requireMock('@/lib/data/parent-configuration-lifecycle')

describe('/api/family/sick-mode/settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates sick mode reads to Parent Configuration Lifecycle', async () => {
    mockGetFamilySickModeConfiguration.mockResolvedValue({
      id: 'sick-settings-1',
      autoEnableOnTemperature: true,
      temperatureThreshold: 100.4,
      autoDisableAfter24Hours: false,
      pauseChores: true,
      pauseScreenTimeTracking: true,
      screenTimeBonus: 60,
      skipMorningRoutine: false,
      skipBedtimeRoutine: false,
      muteNonEssentialNotifs: false,
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/family/sick-mode/settings')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.temperatureThreshold).toBe(100.4)
    expect(mockGetFamilySickModeConfiguration).toHaveBeenCalledWith()
  })

  it('delegates sick mode updates to Parent Configuration Lifecycle', async () => {
    mockUpdateFamilySickModeConfiguration.mockResolvedValue({
      id: 'sick-settings-1',
      autoEnableOnTemperature: true,
      temperatureThreshold: 101.2,
      autoDisableAfter24Hours: true,
      pauseChores: false,
      pauseScreenTimeTracking: true,
      screenTimeBonus: 45,
      skipMorningRoutine: false,
      skipBedtimeRoutine: false,
      muteNonEssentialNotifs: false,
    })

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/family/sick-mode/settings', {
        method: 'PUT',
        body: JSON.stringify({
          autoEnableOnTemperature: true,
          temperatureThreshold: 101.2,
          autoDisableAfter24Hours: true,
          pauseChores: false,
          screenTimeBonus: 45,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.settings.autoDisableAfter24Hours).toBe(true)
    expect(mockUpdateFamilySickModeConfiguration).toHaveBeenCalledWith({
      autoEnableOnTemperature: true,
      temperatureThreshold: 101.2,
      autoDisableAfter24Hours: true,
      pauseChores: false,
      screenTimeBonus: 45,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetFamilySickModeConfiguration.mockRejectedValue(
      new ParentConfigurationLifecycleError(403, 'Parent access required')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/family/sick-mode/settings')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Parent access required')
  })
})
