import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  FamilySickModeConfiguration,
  FamilySickModeConfigurationUpdate,
  ParentConfigurationFamilyPayload,
  ParentConfigurationFamilyProfile,
  ParentConfigurationFamilyRow,
  ParentConfigurationFamilyUpdate,
  ParentConfigurationMealType,
  ParentConfigurationModuleListResult,
  ParentConfigurationModuleRow,
  ParentConfigurationModuleUpdateInput,
  ParentKioskConfiguration,
  ParentKioskConfigurationResult,
  ParentKioskConfigurationUpdate,
} from '@/types/parent-configuration-lifecycle'
import { VALID_PARENT_CONFIGURATION_MEAL_TYPES } from '@/types/parent-configuration-lifecycle'

function normalizeFamilyProfile(payload: ParentConfigurationFamilyPayload): ParentConfigurationFamilyProfile {
  const normalizedMealTypes = (
    payload.family.settings?.plannedMealTypes ?? []
  ).filter((mealType): mealType is ParentConfigurationMealType =>
    VALID_PARENT_CONFIGURATION_MEAL_TYPES.includes(mealType as ParentConfigurationMealType)
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

const familyDataClient = createLifecycleClient({ basePath: '/api/family-data' })

const modulesClient = createLifecycleClient({ basePath: '/api/settings/modules' })

const kioskClient = createLifecycleClient({ basePath: '/api/kiosk/settings' })

const sickConfigClient = createLifecycleClient<FamilySickModeConfiguration>({
  basePath: '/api/family/sick-mode/settings',
  itemKey: 'settings',
})

export async function fetchParentFamilyConfiguration(): Promise<ParentConfigurationFamilyProfile> {
  const data = await familyDataClient.action<ParentConfigurationFamilyPayload>('', 'GET')

  return normalizeFamilyProfile(data)
}

export async function updateParentFamilyConfigurationClient(
  updates: ParentConfigurationFamilyUpdate,
): Promise<{ success: true; family: ParentConfigurationFamilyRow; message: string }> {
  return familyDataClient.action<{
    success: true
    family: ParentConfigurationFamilyRow
    message: string
  }>('', 'PATCH', updates)
}

export async function fetchParentConfigurationModules(): Promise<ParentConfigurationModuleListResult> {
  return modulesClient.action<ParentConfigurationModuleListResult>('', 'GET')
}

export async function updateParentConfigurationModuleClient(
  update: ParentConfigurationModuleUpdateInput,
): Promise<{ success: true; module: ParentConfigurationModuleRow; message: string }> {
  return modulesClient.action<{
    success: true
    module: ParentConfigurationModuleRow
    message: string
  }>('', 'PATCH', update)
}

export async function fetchParentKioskConfiguration(
  familyId?: string,
): Promise<ParentKioskConfigurationResult> {
  return kioskClient.action<ParentKioskConfigurationResult>(
    '',
    'GET',
    undefined,
    undefined,
    familyId ? { familyId } : undefined,
  )
}

export async function updateParentKioskConfigurationClient(
  updates: ParentKioskConfigurationUpdate,
): Promise<ParentKioskConfiguration> {
  return kioskClient.action('', 'PUT', updates, 'settings')
}

export async function fetchFamilySickModeConfiguration(): Promise<FamilySickModeConfiguration> {
  return sickConfigClient.action('', 'GET', undefined, 'settings')
}

export async function updateFamilySickModeConfigurationClient(
  updates: FamilySickModeConfigurationUpdate,
): Promise<FamilySickModeConfiguration> {
  return sickConfigClient.action('', 'PUT', updates, 'settings')
}
