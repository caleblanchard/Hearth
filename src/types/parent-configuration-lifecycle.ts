import type { Database } from '@/lib/database.types'

export type ParentConfigurationModuleId = Database['public']['Enums']['module_id']

export type ParentConfigurationModuleCategory =
  | 'Tasks'
  | 'Planning'
  | 'Management'
  | 'Rewards'
  | 'Health'
  | 'Communication'
  | 'Financial'
  | 'Automation'

export type ParentConfigurationMealType =
  | 'BREAKFAST'
  | 'LUNCH'
  | 'DINNER'
  | 'SNACK'

export type ParentConfigurationKioskWidget =
  | 'transport'
  | 'medication'
  | 'maintenance'
  | 'inventory'
  | 'weather'

export const VALID_PARENT_CONFIGURATION_MEAL_TYPES: ParentConfigurationMealType[] = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
]

export const VALID_PARENT_CONFIGURATION_KIOSK_WIDGETS: ParentConfigurationKioskWidget[] = [
  'transport',
  'medication',
  'maintenance',
  'inventory',
  'weather',
]

export const PARENT_CONFIGURATION_MODULE_CATALOG: Array<{
  moduleId: ParentConfigurationModuleId
  name: string
  description: string
  category: ParentConfigurationModuleCategory
  defaultEnabled: boolean
}> = [
  {
    moduleId: 'CHORES',
    name: 'Chores',
    description: 'Assign and track household chores',
    category: 'Tasks',
    defaultEnabled: true,
  },
  {
    moduleId: 'TODOS',
    name: 'To-Dos',
    description: 'Personal and family task lists',
    category: 'Tasks',
    defaultEnabled: true,
  },
  {
    moduleId: 'ROUTINES',
    name: 'Routines',
    description: 'Morning routines and checklists',
    category: 'Tasks',
    defaultEnabled: true,
  },
  {
    moduleId: 'PROJECTS',
    name: 'Projects',
    description: 'Family projects and collaborative tasks',
    category: 'Tasks',
    defaultEnabled: true,
  },
  {
    moduleId: 'CALENDAR',
    name: 'Calendar',
    description: 'Family calendar and events',
    category: 'Planning',
    defaultEnabled: true,
  },
  {
    moduleId: 'MEAL_PLANNING',
    name: 'Meal Planning',
    description: 'Weekly meal plans and menus',
    category: 'Planning',
    defaultEnabled: true,
  },
  {
    moduleId: 'RECIPES',
    name: 'Recipes',
    description: 'Recipe collection and management',
    category: 'Planning',
    defaultEnabled: true,
  },
  {
    moduleId: 'SHOPPING',
    name: 'Shopping List',
    description: 'Shared shopping lists',
    category: 'Planning',
    defaultEnabled: true,
  },
  {
    moduleId: 'TRANSPORT',
    name: 'Transport',
    description: 'Carpool and transportation scheduling',
    category: 'Planning',
    defaultEnabled: true,
  },
  {
    moduleId: 'INVENTORY',
    name: 'Inventory',
    description: 'Household inventory tracking',
    category: 'Management',
    defaultEnabled: true,
  },
  {
    moduleId: 'MAINTENANCE',
    name: 'Maintenance',
    description: 'Home maintenance tracking',
    category: 'Management',
    defaultEnabled: true,
  },
  {
    moduleId: 'DOCUMENTS',
    name: 'Documents',
    description: 'Family document storage',
    category: 'Management',
    defaultEnabled: true,
  },
  {
    moduleId: 'PETS',
    name: 'Pets',
    description: 'Pet care and tracking',
    category: 'Management',
    defaultEnabled: true,
  },
  {
    moduleId: 'CREDITS',
    name: 'Credits',
    description: 'Family currency and rewards',
    category: 'Rewards',
    defaultEnabled: true,
  },
  {
    moduleId: 'LEADERBOARD',
    name: 'Leaderboard',
    description: 'Family achievements leaderboard',
    category: 'Rewards',
    defaultEnabled: true,
  },
  {
    moduleId: 'SCREEN_TIME',
    name: 'Screen Time',
    description: 'Screen time management',
    category: 'Rewards',
    defaultEnabled: true,
  },
  {
    moduleId: 'HEALTH',
    name: 'Health',
    description: 'Health tracking and records',
    category: 'Health',
    defaultEnabled: true,
  },
  {
    moduleId: 'COMMUNICATION',
    name: 'Communication Board',
    description: 'Family message board',
    category: 'Communication',
    defaultEnabled: true,
  },
  {
    moduleId: 'FINANCIAL',
    name: 'Financial',
    description: 'Budget and expense tracking',
    category: 'Financial',
    defaultEnabled: true,
  },
  {
    moduleId: 'RULES_ENGINE',
    name: 'Rules & Automation',
    description: 'Automated family rules',
    category: 'Automation',
    defaultEnabled: false,
  },
]

export const DEFAULT_ENABLED_PARENT_CONFIGURATION_MODULE_IDS =
  PARENT_CONFIGURATION_MODULE_CATALOG.filter((module) => module.defaultEnabled).map(
    (module) => module.moduleId
  )

export interface ParentConfigurationFamilySettings {
  currency: string
  weekStartDay: string
  plannedMealTypes: ParentConfigurationMealType[]
}

export interface ParentConfigurationFamilyProfile {
  id: string
  name: string
  timezone: string
  location: string | null
  latitude: number | null
  longitude: number | null
  settings: ParentConfigurationFamilySettings
}

export interface ParentConfigurationFamilyUpdate {
  name?: string
  timezone?: string
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  currency?: string
  weekStartDay?: string
  plannedMealTypes?: ParentConfigurationMealType[]
}

export interface ParentConfigurationFamilyPayload {
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
}

export interface ParentConfigurationModuleRecord {
  moduleId: ParentConfigurationModuleId
  name: string
  description: string
  category: ParentConfigurationModuleCategory
  isEnabled: boolean
  enabledAt: string | null
  disabledAt: string | null
  updatedAt: string | null
}

export type ParentConfigurationFamilyRow = Database['public']['Tables']['families']['Row']

export type ParentConfigurationModuleRow = Database['public']['Tables']['module_configurations']['Row']

export interface ParentConfigurationModuleListResult {
  modules: ParentConfigurationModuleRecord[]
  categories: Record<string, ParentConfigurationModuleRecord[]>
}

export interface ParentConfigurationModuleUpdateInput {
  moduleId: ParentConfigurationModuleId | string
  isEnabled: boolean
}

export interface ParentKioskConfiguration {
  isEnabled: boolean
  autoLockMinutes: number
  enabledWidgets: ParentConfigurationKioskWidget[]
  allowGuestView: boolean
  requirePinForSwitch: boolean
}

export interface ParentKioskConfigurationDevice {
  id: string
  deviceId: string
  lastUsedAt: string | null
}

export interface ParentKioskConfigurationResult {
  settings: ParentKioskConfiguration
  devices: ParentKioskConfigurationDevice[]
}

export interface ParentKioskConfigurationUpdate
  extends Partial<ParentKioskConfiguration> {
  familyId?: string
}

export interface FamilySickModeConfiguration {
  id: string
  autoEnableOnTemperature: boolean
  temperatureThreshold: number
  autoDisableAfter24Hours: boolean
  pauseChores: boolean
  pauseScreenTimeTracking: boolean
  screenTimeBonus: number
  skipMorningRoutine: boolean
  skipBedtimeRoutine: boolean
  muteNonEssentialNotifs: boolean
}

export type FamilySickModeConfigurationUpdate =
  Partial<FamilySickModeConfiguration>
