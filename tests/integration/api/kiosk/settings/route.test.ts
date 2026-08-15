import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/kiosk/settings/route'

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
    getParentKioskConfiguration: jest.fn(),
    updateParentKioskConfiguration: jest.fn(),
  }
})

const {
  ParentConfigurationLifecycleError,
  getParentKioskConfiguration: mockGetParentKioskConfiguration,
  updateParentKioskConfiguration: mockUpdateParentKioskConfiguration,
} = jest.requireMock('@/lib/data/parent-configuration-lifecycle')

describe('/api/kiosk/settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates kiosk reads to Parent Configuration Lifecycle', async () => {
    mockGetParentKioskConfiguration.mockResolvedValue({
      settings: {
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport'],
        allowGuestView: true,
        requirePinForSwitch: true,
      },
      devices: [],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.isEnabled).toBe(true)
    expect(mockGetParentKioskConfiguration).toHaveBeenCalledWith({
      familyId: 'family-1',
    })
  })

  it('delegates kiosk updates to Parent Configuration Lifecycle', async () => {
    mockUpdateParentKioskConfiguration.mockResolvedValue({
      isEnabled: false,
      autoLockMinutes: 30,
      enabledWidgets: ['weather'],
      allowGuestView: false,
      requirePinForSwitch: true,
    })

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/kiosk/settings', {
        method: 'PUT',
        body: JSON.stringify({
          familyId: 'family-1',
          isEnabled: false,
          autoLockMinutes: 30,
          enabledWidgets: ['weather'],
          allowGuestView: false,
          requirePinForSwitch: true,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.isEnabled).toBe(false)
    expect(mockUpdateParentKioskConfiguration).toHaveBeenCalledWith({
      familyId: 'family-1',
      isEnabled: false,
      autoLockMinutes: 30,
      enabledWidgets: ['weather'],
      allowGuestView: false,
      requirePinForSwitch: true,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    mockGetParentKioskConfiguration.mockRejectedValue(
      new ParentConfigurationLifecycleError(403, 'Only parents can manage kiosk settings')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/kiosk/settings?familyId=family-1')
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Only parents can manage kiosk settings')
  })
})
