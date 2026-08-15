import type {
  FamilySickModeConfiguration,
  FamilySickModeConfigurationUpdate,
  ParentConfigurationFamilyProfile,
  ParentConfigurationFamilyUpdate,
  ParentConfigurationMealType,
  ParentConfigurationModuleListResult,
  ParentConfigurationModuleUpdateInput,
  ParentKioskConfiguration,
  ParentKioskConfigurationResult,
  ParentKioskConfigurationUpdate,
} from '@/types/parent-configuration-lifecycle'
import { VALID_PARENT_CONFIGURATION_MEAL_TYPES } from '@/types/parent-configuration-lifecycle'
import { apiRequest } from '@/lib/api-client'

function normalizeFamilyProfile(payload: {
  family: {
    id: string
    name: string
    timezone: string
    location?: string | null
    latitude?: number | null
    longitude?: number | null
    settings?: {
      currency?: string
      weekStartDay?: string
      plannedMealTypes?: string[]
    }
  }
}): ParentConfigurationFamilyProfile {
  const normalizedMealTypes = (
    payload.family.settings?.plannedMealTypes ?? []
  ).filter((mealType): mealType is ParentConfigurationMealType =>
    VALID_PARENT_CONFIGURATION_MEAL_TYPES.includes(
      mealType as ParentConfigurationMealType
    )
  )

  return {
    id: payload.family.id,
    name: payload.family.name,
    timezone: payload.family.timezone,
    location: payload.family.location ?? null,
    latitude: payload.family.latitude ?? null,
    longitude: payload.family.longitude ?? null,
    settings: {
      currency: payload.family.settings?.currency ?? 'USD',
      weekStartDay: payload.family.settings?.weekStartDay ?? 'SUNDAY',
      plannedMealTypes:
        normalizedMealTypes.length > 0
          ? normalizedMealTypes
          : VALID_PARENT_CONFIGURATION_MEAL_TYPES,
    },
  }
}

export async function fetchParentFamilyConfiguration() {
  const data = await apiRequest<{
    family: {
      id: string
      name: string
      timezone: string
      location?: string | null
      latitude?: number | null
      longitude?: number | null
      settings?: {
        currency?: string
        weekStartDay?: string
        plannedMealTypes?: string[]
      }
    }
  }>('/api/family-data')

  return normalizeFamilyProfile(data)
}

export async function updateParentFamilyConfigurationClient(
  updates: ParentConfigurationFamilyUpdate
) {
  return apiRequest<{ success: true; family: unknown; message: string }>('/api/family-data', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function fetchParentConfigurationModules() {
  return apiRequest<ParentConfigurationModuleListResult>('/api/settings/modules')
}

export async function updateParentConfigurationModuleClient(
  update: ParentConfigurationModuleUpdateInput
) {
  return apiRequest<{ success: true; module: unknown; message: string }>('/api/settings/modules', {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export async function fetchParentKioskConfiguration(familyId?: string) {
  const params = new URLSearchParams()
  if (familyId) params.set('familyId', familyId)

  return apiRequest<ParentKioskConfigurationResult>(
    params.toString() ? `/api/kiosk/settings?${params}` : '/api/kiosk/settings'
  )
}

export async function updateParentKioskConfigurationClient(
  updates: ParentKioskConfigurationUpdate
) {
  const data = await apiRequest<{ settings: ParentKioskConfiguration }>('/api/kiosk/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.settings
}

export async function fetchFamilySickModeConfiguration() {
  const data = await apiRequest<{ settings: FamilySickModeConfiguration }>(
    '/api/family/sick-mode/settings'
  )
  return data.settings
}

export async function updateFamilySickModeConfigurationClient(
  updates: FamilySickModeConfigurationUpdate
) {
  const data = await apiRequest<{
    success: true
    settings: FamilySickModeConfiguration
    message: string
  }>('/api/family/sick-mode/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.settings
}
