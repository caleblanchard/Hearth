import { createClient } from '@/lib/supabase/server'

type ModuleId = 
  | 'CHORES'
  | 'SCREEN_TIME'
  | 'CREDITS'
  | 'SHOPPING'
  | 'CALENDAR'
  | 'TODOS'
  | 'ROUTINES'
  | 'MEAL_PLANNING'
  | 'RECIPES'
  | 'INVENTORY'
  | 'HEALTH'
  | 'PROJECTS'
  | 'COMMUNICATION'
  | 'TRANSPORT'
  | 'PETS'
  | 'MAINTENANCE'
  | 'DOCUMENTS'
  | 'FINANCIAL'
  | 'LEADERBOARD'
  | 'RULES_ENGINE'

// All modules that should be enabled by default
const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'CHORES',
  'SCREEN_TIME',
  'CREDITS',
  'SHOPPING',
  'CALENDAR',
  'TODOS',
  'ROUTINES',
  'MEAL_PLANNING',
  'RECIPES',
  'INVENTORY',
  'HEALTH',
  'PROJECTS',
  'COMMUNICATION',
  'TRANSPORT',
  'PETS',
  'MAINTENANCE',
  'DOCUMENTS',
  'FINANCIAL',
  'LEADERBOARD',
]

/**
 * Get all enabled modules for a specific family
 * @param familyId - The family ID to get enabled modules for
 * @returns Array of enabled module IDs
 */
export async function getEnabledModules(familyId: string): Promise<ModuleId[]> {
  const supabase = await createClient()
  
  // Get all configured modules for this family
  const { data: allConfigs } = await supabase
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', familyId)

  // If no configurations exist, return all defaults
  if (!allConfigs || allConfigs.length === 0) {
    return DEFAULT_ENABLED_MODULES
  }

  const configuredModuleIds = new Set(allConfigs.map((c) => c.module_id))
  const enabledConfiguredIds = allConfigs
    .filter((c) => c.is_enabled)
    .map((c) => c.module_id as ModuleId)

  // Combine enabled configured + default unconfigured
  return [
    ...enabledConfiguredIds,
    ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
  ]
}

/**
 * Check if a specific module is enabled for a family
 * @param familyId - The family ID
 * @param moduleId - The module ID to check
 * @returns true if enabled, false otherwise
 */
export async function isModuleEnabledForFamily(
  familyId: string,
  moduleId: ModuleId
): Promise<boolean> {
  const supabase = await createClient()
  
  // Check if there's a configuration for this module
  const { data: config } = await supabase
    .from('module_configurations')
    .select('is_enabled')
    .eq('family_id', familyId)
    .eq('module_id', moduleId)
    .maybeSingle()

  // If no config exists, check if it's in default enabled list
  if (!config) {
    return DEFAULT_ENABLED_MODULES.includes(moduleId)
  }

  return config.is_enabled
}
