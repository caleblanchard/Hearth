/**
 * Module Protection Utilities
 * Handles module enablement checks and page protection
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

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
  | 'LEADERBOARD';

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
];

/**
 * Check if a module is enabled for the current user's family.
 * Returns true if enabled, false if disabled.
 */
export async function isModuleEnabled(moduleId: ModuleId): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.familyId) {
    return false;
  }

  const supabase = await createClient();
  
  // Check if there's a configuration for this module
  const { data: config } = await supabase
    .from('module_configurations')
    .select('is_enabled')
    .eq('family_id', session.user.familyId)
    .eq('module_id', moduleId)
    .maybeSingle();

  // If no config exists, check if it's in default enabled list
  if (!config) {
    return DEFAULT_ENABLED_MODULES.includes(moduleId);
  }

  return config.is_enabled;
}

/**
 * Protect a page by checking if the required module is enabled.
 * Returns 404 if module is disabled.
 *
 * Usage in Server Components:
 * ```tsx
 * export default async function ChoresPage() {
 *   await requireModule('CHORES');
 *   // Rest of component...
 * }
 * ```
 */
export async function requireModule(moduleId: ModuleId): Promise<void> {
  const enabled = await isModuleEnabled(moduleId);
  if (!enabled) {
    notFound();
  }
}

/**
 * Get all enabled modules for the current user's family
 */
export async function getEnabledModules(): Promise<ModuleId[]> {
  const session = await auth();
  if (!session?.user?.familyId) {
    return [];
  }

  const supabase = await createClient();
  
  const { data: configs } = await supabase
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', session.user.familyId)
    .eq('is_enabled', true);

  // If no configurations exist, return all defaults
  if (!configs || configs.length === 0) {
    return DEFAULT_ENABLED_MODULES;
  }

  // Get all configured modules
  const { data: allConfigs } = await supabase
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', session.user.familyId);

  if (!allConfigs) {
    return DEFAULT_ENABLED_MODULES;
  }

  const configuredModuleIds = new Set(allConfigs.map((c) => c.module_id));
  const enabledConfiguredIds = allConfigs
    .filter((c) => c.is_enabled)
    .map((c) => c.module_id as ModuleId);

  // Combine enabled configured + default unconfigured
  return [
    ...enabledConfiguredIds,
    ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
  ];
}
