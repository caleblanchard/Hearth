jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/auth/parent-authorization-context', () => ({
  resolveParentAuthorizationContext: jest.fn(),
  requireParentAuthorizationContext: jest.fn(),
}))

jest.mock('@/lib/data/families', () => ({
  getFamily: jest.fn(),
  updateFamily: jest.fn(),
}))

jest.mock('@/lib/data/settings', () => ({
  getModuleConfigurations: jest.fn(),
  updateModuleConfiguration: jest.fn(),
}))

jest.mock('@/lib/data/kiosk-settings', () => ({
  getOrCreateKioskSettings: jest.fn(),
  updateKioskSettings: jest.fn(),
}))

jest.mock('@/lib/data/health', () => ({
  getSickModeSettings: jest.fn(),
  updateSickModeSettings: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { LifecycleError } from '@/lib/data/lifecycle-core'
import {
  getParentKioskConfiguration,
  listParentConfigurationModules,
  updateFamilySickModeConfiguration,
  updateParentFamilyConfiguration,
} from '@/lib/data/parent-configuration-lifecycle'

const {
  resolveParentAuthorizationContext: mockResolveParentAuthorizationContext,
  requireParentAuthorizationContext: mockRequireParentAuthorizationContext,
} = jest.requireMock('@/lib/auth/parent-authorization-context')
const { getFamily: mockGetFamily, updateFamily: mockUpdateFamily } = jest.requireMock(
  '@/lib/data/families'
)
const {
  getModuleConfigurations: mockGetModuleConfigurations,
} = jest.requireMock('@/lib/data/settings')
const {
  getOrCreateKioskSettings: mockGetOrCreateKioskSettings,
} = jest.requireMock('@/lib/data/kiosk-settings')
const {
  getSickModeSettings: mockGetSickModeSettings,
  updateSickModeSettings: mockUpdateSickModeSettings,
} = jest.requireMock('@/lib/data/health')
const { createClient: mockCreateClient } = jest.requireMock('@/lib/supabase/server')

function createAuditClient() {
  const insert = jest.fn().mockResolvedValue({ error: null })
  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'audit_logs') {
          return { insert }
        }

        if (table === 'kiosk_device_secrets') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'device-secret-1',
                      device_id: 'kiosk-tablet',
                      last_used_at: '2026-05-27T10:00:00.000Z',
                      revoked_at: null,
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    },
    insert,
  }
}

describe('parent-configuration-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockResolveParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'parent-1',
      memberships: [
        {
          id: 'parent-1',
          familyId: 'family-1',
          role: 'PARENT',
        },
      ],
    })
    mockRequireParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'parent-1',
      memberships: [
        {
          id: 'parent-1',
          familyId: 'family-1',
          role: 'PARENT',
        },
      ],
      activeMembership: {
        id: 'parent-1',
        familyId: 'family-1',
        role: 'PARENT',
        name: 'Parent One',
      },
    })
  })

  it('lists normalized module configurations and applies shared default enablement', async () => {
    mockGetModuleConfigurations.mockResolvedValue([
      {
        module_id: 'CALENDAR',
        is_enabled: false,
        enabled_at: null,
        disabled_at: '2026-05-20T10:00:00.000Z',
        updated_at: '2026-05-20T10:00:00.000Z',
      },
    ])

    const result = await listParentConfigurationModules()

    expect(mockRequireParentAuthorizationContext).toHaveBeenCalled()
    expect(result.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: 'CALENDAR',
          category: 'Planning',
          isEnabled: false,
        }),
        expect.objectContaining({
          moduleId: 'CHORES',
          category: 'Tasks',
          isEnabled: true,
        }),
        expect.objectContaining({
          moduleId: 'RULES_ENGINE',
          category: 'Automation',
          isEnabled: false,
        }),
      ])
    )
    expect(result.categories.Planning).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: 'CALENDAR',
          isEnabled: false,
        }),
      ])
    )
  })

  it('rejects invalid planned meal type updates', async () => {
    await expect(
      updateParentFamilyConfiguration({
        plannedMealTypes: ['BREAKFAST', 'SECOND_BREAKFAST'] as any,
      })
    ).rejects.toEqual(
      new LifecycleError(
        400,
        'Invalid meal types: SECOND_BREAKFAST'
      )
    )
  })

  it('merges normalized family settings updates into the family record', async () => {
    mockGetFamily.mockResolvedValue({
      id: 'family-1',
      name: 'Before',
      timezone: 'America/New_York',
      location: 'Old Town',
      latitude: 10,
      longitude: 20,
      settings: {
        currency: 'USD',
        weekStartDay: 'SUNDAY',
        plannedMealTypes: ['BREAKFAST', 'DINNER'],
      },
    })
    mockUpdateFamily.mockResolvedValue({
      id: 'family-1',
    })

    await updateParentFamilyConfiguration({
      name: 'After',
      weekStartDay: 'MONDAY',
      plannedMealTypes: ['LUNCH', 'DINNER'],
    })

    expect(mockUpdateFamily).toHaveBeenCalledWith('family-1', {
      name: 'After',
      settings: {
        currency: 'USD',
        weekStartDay: 'MONDAY',
        plannedMealTypes: ['LUNCH', 'DINNER'],
      },
    })
  })

  it('returns normalized kiosk settings with active devices', async () => {
    const { client } = createAuditClient()
    mockCreateClient.mockResolvedValue(client)
    mockGetOrCreateKioskSettings.mockResolvedValue({
      id: 'kiosk-settings-1',
      family_id: 'family-1',
      is_enabled: true,
      auto_lock_minutes: 15,
      enabled_widgets: ['transport', 'weather'],
      allow_guest_view: true,
      require_pin_for_switch: false,
    })

    const result = await getParentKioskConfiguration()

    expect(result).toEqual({
      settings: {
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport', 'weather'],
        allowGuestView: true,
        requirePinForSwitch: false,
      },
      devices: [
        {
          id: 'device-secret-1',
          deviceId: 'kiosk-tablet',
          lastUsedAt: '2026-05-27T10:00:00.000Z',
        },
      ],
    })
  })

  it('maps sick mode updates to storage shape and records an audit log', async () => {
    const { client, insert } = createAuditClient()
    mockCreateClient.mockResolvedValue(client)
    mockGetSickModeSettings.mockResolvedValue({
      id: 'sick-settings-1',
      family_id: 'family-1',
      auto_enable_on_temperature: false,
      auto_disable_after_24_hours: false,
      pause_chores: true,
      pause_screen_time_tracking: true,
      screen_time_bonus: 30,
      skip_morning_routine: false,
      skip_bedtime_routine: false,
      mute_non_essential_notifs: false,
      temperature_threshold: 100.4,
    })
    mockUpdateSickModeSettings.mockResolvedValue({
      id: 'sick-settings-1',
      family_id: 'family-1',
      auto_enable_on_temperature: true,
      auto_disable_after_24_hours: true,
      pause_chores: false,
      pause_screen_time_tracking: true,
      screen_time_bonus: 45,
      skip_morning_routine: false,
      skip_bedtime_routine: false,
      mute_non_essential_notifs: false,
      temperature_threshold: 101.2,
    })

    const result = await updateFamilySickModeConfiguration({
      autoEnableOnTemperature: true,
      autoDisableAfter24Hours: true,
      pauseChores: false,
      screenTimeBonus: 45,
      temperatureThreshold: 101.2,
    })

    expect(mockUpdateSickModeSettings).toHaveBeenCalledWith('family-1', {
      auto_enable_on_temperature: true,
      auto_disable_after_24_hours: true,
      pause_chores: false,
      screen_time_bonus: 45,
      temperature_threshold: 101.2,
    })
    expect(result).toEqual(
      expect.objectContaining({
        autoEnableOnTemperature: true,
        autoDisableAfter24Hours: true,
        pauseChores: false,
        screenTimeBonus: 45,
        temperatureThreshold: 101.2,
      })
    )
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: 'family-1',
        member_id: 'parent-1',
        action: 'SICK_MODE_SETTINGS_UPDATED',
      })
    )
  })
})
