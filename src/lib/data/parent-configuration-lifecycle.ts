import { createClient } from '@/lib/supabase/server'
import {
  writeAuditLog,
  LifecycleError,
  readObject,
  readString,
  readNullableString,
  readNullableNumber,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { pickDefined } from '@/lib/readers'
import type { LifecycleViewerContext } from '@/lib/data/lifecycle-core'
import { getFamily, updateFamily } from '@/lib/data/families'
import {
  getModuleConfigurations as getStoredModuleConfigurations,
  updateModuleConfiguration as persistModuleConfiguration,
} from '@/lib/data/settings'
import {
  getOrCreateKioskSettings,
  updateKioskSettings,
} from '@/lib/data/kiosk-settings'
import {
  getSickModeSettings,
  updateSickModeSettings,
} from '@/lib/data/health'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import type {
  FamilySickModeConfiguration,
  FamilySickModeConfigurationUpdate,
  ParentConfigurationFamilyProfile,
  ParentConfigurationFamilySettings,
  ParentConfigurationFamilyUpdate,
  ParentConfigurationKioskWidget,
  ParentConfigurationMealType,
  ParentConfigurationModuleId,
  ParentConfigurationModuleListResult,
  ParentConfigurationModuleRecord,
  ParentConfigurationModuleUpdateInput,
  ParentKioskConfiguration,
  ParentKioskConfigurationResult,
  ParentKioskConfigurationUpdate,
} from '@/types/parent-configuration-lifecycle'
import {
  DEFAULT_ENABLED_PARENT_CONFIGURATION_MODULE_IDS,
  PARENT_CONFIGURATION_MODULE_CATALOG,
  VALID_PARENT_CONFIGURATION_KIOSK_WIDGETS,
  VALID_PARENT_CONFIGURATION_MEAL_TYPES,
} from '@/types/parent-configuration-lifecycle'

type FamilyRow = Database['public']['Tables']['families']['Row']
type ModuleConfigurationRow =
  Database['public']['Tables']['module_configurations']['Row']
type SickModeSettingsRow = Database['public']['Tables']['sick_mode_settings']['Row']
type KioskSettingsRow = Database['public']['Tables']['kiosk_settings']['Row']

function normalizeMealTypes(
  value: unknown
): ParentConfigurationMealType[] {
  if (!Array.isArray(value)) {
    return VALID_PARENT_CONFIGURATION_MEAL_TYPES
  }

  const normalized = value.filter((mealType): mealType is ParentConfigurationMealType =>
    VALID_PARENT_CONFIGURATION_MEAL_TYPES.includes(
      mealType as ParentConfigurationMealType
    )
  )

  return normalized.length > 0
    ? normalized
    : VALID_PARENT_CONFIGURATION_MEAL_TYPES
}

function normalizeFamilySettings(
  value: unknown
): ParentConfigurationFamilySettings {
  const settings = readObject(value)

  return {
    currency: readString(settings.currency, 'USD'),
    weekStartDay: readString(settings.weekStartDay, 'SUNDAY'),
    plannedMealTypes: normalizeMealTypes(settings.plannedMealTypes),
  }
}

function mapFamilyProfile(family: FamilyRow): ParentConfigurationFamilyProfile {
  return {
    id: family.id,
    name: family.name,
    timezone: family.timezone,
    location: readNullableString(family.location),
    latitude: readNullableNumber(family.latitude),
    longitude: readNullableNumber(family.longitude),
    settings: normalizeFamilySettings(family.settings),
  }
}

function ensureValidMealTypes(
  plannedMealTypes: ParentConfigurationFamilyUpdate['plannedMealTypes']
): ParentConfigurationMealType[] | undefined {
  if (typeof plannedMealTypes === 'undefined') {
    return undefined
  }

  if (!Array.isArray(plannedMealTypes) || plannedMealTypes.length === 0) {
    throw new LifecycleError(
      400,
      'plannedMealTypes must be a non-empty array'
    )
  }

  const invalid = plannedMealTypes.filter(
    (mealType) => !VALID_PARENT_CONFIGURATION_MEAL_TYPES.includes(mealType)
  )

  if (invalid.length > 0) {
    throw new LifecycleError(
      400,
      `Invalid meal types: ${invalid.join(', ')}`
    )
  }

  return plannedMealTypes
}

function ensureValidModuleId(moduleId: string): ParentConfigurationModuleId {
  const match = PARENT_CONFIGURATION_MODULE_CATALOG.find(
    (module) => module.moduleId === moduleId
  )

  if (!match) {
    throw new LifecycleError(400, 'Module ID is required')
  }

  return match.moduleId
}

function buildModuleConfigurationList(
  configurations: ModuleConfigurationRow[]
): ParentConfigurationModuleListResult {
  const configurationById = new Map(
    configurations.map((configuration) => [configuration.module_id, configuration])
  )

  const modules = PARENT_CONFIGURATION_MODULE_CATALOG.map((module) => {
    const configuration = configurationById.get(module.moduleId)

    return {
      moduleId: module.moduleId,
      name: module.name,
      description: module.description,
      category: module.category,
      isEnabled: configuration?.is_enabled ?? module.defaultEnabled,
      enabledAt: configuration?.enabled_at ?? null,
      disabledAt: configuration?.disabled_at ?? null,
      updatedAt: configuration?.updated_at ?? null,
    } satisfies ParentConfigurationModuleRecord
  })

  const categories: Record<string, ParentConfigurationModuleRecord[]> = {}

  for (const module of modules) {
    if (!categories[module.category]) {
      categories[module.category] = []
    }

    categories[module.category].push(module)
  }

  return { modules, categories }
}

function mapKioskSettings(settings: KioskSettingsRow): ParentKioskConfiguration {
  return {
    isEnabled: settings.is_enabled,
    autoLockMinutes: settings.auto_lock_minutes,
    enabledWidgets:
      (settings.enabled_widgets ?? []) as ParentConfigurationKioskWidget[],
    allowGuestView: settings.allow_guest_view,
    requirePinForSwitch: settings.require_pin_for_switch,
  }
}

function mapSickModeSettings(
  settings: SickModeSettingsRow
): FamilySickModeConfiguration {
  return {
    id: settings.id,
    autoEnableOnTemperature: settings.auto_enable_on_temperature,
    temperatureThreshold: settings.temperature_threshold,
    autoDisableAfter24Hours: settings.auto_disable_after_24_hours,
    pauseChores: settings.pause_chores,
    pauseScreenTimeTracking: settings.pause_screen_time_tracking,
    screenTimeBonus: settings.screen_time_bonus,
    skipMorningRoutine: settings.skip_morning_routine,
    skipBedtimeRoutine: settings.skip_bedtime_routine,
    muteNonEssentialNotifs: settings.mute_non_essential_notifs,
  }
}

function selectManagedFamily(
  context: LifecycleViewerContext,
  requestedFamilyId: string | undefined,
  forbiddenMessage: string
) {
  if (!requestedFamilyId || requestedFamilyId === context.familyId) {
    return {
      familyId: context.familyId,
      memberId: context.memberId,
    }
  }

  const membership = context.memberships.find(
    (candidate) =>
      candidate.familyId === requestedFamilyId && candidate.role === 'PARENT'
  )

  if (!membership) {
    throw new LifecycleError(403, forbiddenMessage)
  }

  return {
    familyId: requestedFamilyId,
    memberId: membership.id,
  }
}

export async function listParentConfigurationModules() {
  const context = await requireParentContext()
  const configurations = await getStoredModuleConfigurations(context.familyId)
  return buildModuleConfigurationList(configurations)
}

export async function updateParentConfigurationModule(
  input: ParentConfigurationModuleUpdateInput
) {
  const context = await requireParentContext()
  const moduleId = ensureValidModuleId(readString(input.moduleId))

  return persistModuleConfiguration(context.familyId, moduleId, {
    is_enabled: input.isEnabled,
  })
}

export async function updateParentFamilyConfiguration(
  updates: ParentConfigurationFamilyUpdate
) {
  const context = await requireParentContext()
  const plannedMealTypes = ensureValidMealTypes(updates.plannedMealTypes)
  const currentFamily = await getFamily(context.familyId)
  const currentProfile = mapFamilyProfile(currentFamily)
  const nextSettings = { ...currentProfile.settings }
  const updateData: Database['public']['Tables']['families']['Update'] = {}

  Object.assign(
    updateData,
    pickDefined('name', updates.name),
    pickDefined('timezone', updates.timezone),
    pickDefined('location', updates.location),
    pickDefined('latitude', updates.latitude),
    pickDefined('longitude', updates.longitude)
  )
  Object.assign(
    nextSettings,
    pickDefined('currency', updates.currency),
    pickDefined('weekStartDay', updates.weekStartDay)
  )
  if (plannedMealTypes) nextSettings.plannedMealTypes = plannedMealTypes

  updateData.settings = nextSettings

  const updatedFamily = await updateFamily(context.familyId, updateData)

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'SETTINGS_CHANGED',
    entityType: 'MEMBER',
    entityId: context.memberId,
    previousValue: currentProfile,
    newValue: mapFamilyProfile(updatedFamily),
  })

  return updatedFamily
}

export async function getParentKioskConfiguration(input: {
  familyId?: string
} = {}): Promise<ParentKioskConfigurationResult> {
  const context = await requireParentContext(
    'Only parents can manage kiosk settings'
  )
  const managed = selectManagedFamily(
    context,
    input.familyId,
    'Only parents can manage kiosk settings'
  )
  const settings = await getOrCreateKioskSettings(managed.familyId)
  const supabase = await createClient()
  const { data: devices, error: deviceError } = await supabase
    .from('kiosk_device_secrets')
    .select('id,device_id,last_used_at,revoked_at')
    .eq('family_id', managed.familyId)
    .is('revoked_at', null)

  if (deviceError) {
    logger.error('Error fetching kiosk devices', deviceError)
  }

  return {
    settings: mapKioskSettings(settings),
    devices:
      devices?.map((device) => ({
        id: device.id,
        deviceId: device.device_id,
        lastUsedAt: device.last_used_at,
      })) ?? [],
  }
}

export async function updateParentKioskConfiguration(
  updates: ParentKioskConfigurationUpdate
) {
  const context = await requireParentContext(
    'Only parents can manage kiosk settings'
  )
  const managed = selectManagedFamily(
    context,
    updates.familyId,
    'Only parents can manage kiosk settings'
  )

  if (
    typeof updates.autoLockMinutes !== 'undefined' &&
    updates.autoLockMinutes <= 0
  ) {
    throw new LifecycleError(
      400,
      'Auto-lock minutes must be greater than 0'
    )
  }

  if (typeof updates.enabledWidgets !== 'undefined') {
    const invalidWidgets = updates.enabledWidgets.filter(
      (widget) => !VALID_PARENT_CONFIGURATION_KIOSK_WIDGETS.includes(widget)
    )

    if (invalidWidgets.length > 0) {
      throw new LifecycleError(400, 'Invalid widget names')
    }
  }

  await getOrCreateKioskSettings(managed.familyId)

  const settings = await updateKioskSettings(managed.familyId, {
    ...pickDefined('is_enabled', updates.isEnabled),
    ...pickDefined('auto_lock_minutes', updates.autoLockMinutes),
    ...pickDefined('enabled_widgets', updates.enabledWidgets),
    ...pickDefined('allow_guest_view', updates.allowGuestView),
    ...pickDefined('require_pin_for_switch', updates.requirePinForSwitch),
  })

  await writeAuditLog({
    familyId: managed.familyId,
    memberId: managed.memberId,
    action: 'KIOSK_SETTINGS_UPDATED',
    entityType: 'KIOSK_SETTINGS',
    entityId: settings.id,
    metadata: {
      changes: updates,
    },
  })

  return mapKioskSettings(settings)
}

export async function getFamilySickModeConfiguration() {
  const context = await requireViewerContext()
  let settings = await getSickModeSettings(context.familyId)

  if (!settings) {
    settings = await updateSickModeSettings(context.familyId, {})
  }

  return mapSickModeSettings(settings)
}

export async function updateFamilySickModeConfiguration(
  updates: FamilySickModeConfigurationUpdate
) {
  const context = await requireParentContext()

  if (
    typeof updates.temperatureThreshold !== 'undefined' &&
    (typeof updates.temperatureThreshold !== 'number' ||
      updates.temperatureThreshold <= 0)
  ) {
    throw new LifecycleError(
      400,
      'Temperature threshold must be a positive number'
    )
  }

  if (
    typeof updates.screenTimeBonus !== 'undefined' &&
    (typeof updates.screenTimeBonus !== 'number' || updates.screenTimeBonus < 0)
  ) {
    throw new LifecycleError(
      400,
      'Screen time bonus must be a non-negative number'
    )
  }

  const currentSettings = await getSickModeSettings(context.familyId)
  const nextSettings = await updateSickModeSettings(context.familyId, {
    ...pickDefined('auto_enable_on_temperature', updates.autoEnableOnTemperature),
    ...pickDefined('temperature_threshold', updates.temperatureThreshold),
    ...pickDefined('auto_disable_after_24_hours', updates.autoDisableAfter24Hours),
    ...pickDefined('pause_chores', updates.pauseChores),
    ...pickDefined('pause_screen_time_tracking', updates.pauseScreenTimeTracking),
    ...pickDefined('screen_time_bonus', updates.screenTimeBonus),
    ...pickDefined('skip_morning_routine', updates.skipMorningRoutine),
    ...pickDefined('skip_bedtime_routine', updates.skipBedtimeRoutine),
    ...pickDefined('mute_non_essential_notifs', updates.muteNonEssentialNotifs),
  })

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'SICK_MODE_SETTINGS_UPDATED',
    entityType: 'SICK_MODE_SETTINGS',
    entityId: nextSettings.id,
    previousValue: currentSettings ?? null,
    newValue: nextSettings,
  })

  return mapSickModeSettings(nextSettings)
}
