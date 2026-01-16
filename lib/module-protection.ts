/**
 * Module Protection Utilities
 * Handles module enablement checks and page protection
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { redirect, notFound } from 'next/navigation';
import { getAuthContext } from '@/lib/supabase/server';
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
  const authContext = await getAuthContext();
  if (!authContext?.defaultFamilyId) {
    return false;
  }

  const supabase = await createClient();
  
  // Check if there's a configuration for this module
  const { data: config } = await supabase
    .from('module_configurations')
    .select('is_enabled')
    .eq('family_id', authContext.defaultFamilyId)
    .eq('module_id', moduleId)
    .maybeSingle();

  // If no config exists, check if it's in default enabled list
  const familyEnabled = config ? config.is_enabled : DEFAULT_ENABLED_MODULES.includes(moduleId);
  if (!familyEnabled) {
    return false;
  }

  const memberId = authContext.activeMemberId || authContext.defaultMemberId;
  if (!memberId) {
    return familyEnabled;
  }

  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('id', memberId)
    .single();

  if (member?.role !== 'CHILD') {
    return familyEnabled;
  }

  const { data: accessRows } = await supabase
    .from('member_module_access')
    .select('module_id, has_access')
    .eq('member_id', memberId);

  if (!accessRows || accessRows.length === 0) {
    return familyEnabled;
  }

  const accessRow = accessRows.find((row) => row.module_id === moduleId);
  return accessRow?.has_access ?? false;
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
  const authContext = await getAuthContext();
  if (!authContext?.defaultFamilyId) {
    return [];
  }

  const supabase = await createClient();
  
  const { data: configs } = await supabase
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', authContext.defaultFamilyId)
    .eq('is_enabled', true);

  // If no configurations exist, return all defaults
  if (!configs || configs.length === 0) {
    const defaults = DEFAULT_ENABLED_MODULES;
    return filterMemberAccess(supabase, authContext, defaults);
  }

  // Get all configured modules
  const { data: allConfigs } = await supabase
    .from('module_configurations')
    .select('module_id, is_enabled')
    .eq('family_id', authContext.defaultFamilyId);

  if (!allConfigs) {
    return filterMemberAccess(supabase, authContext, DEFAULT_ENABLED_MODULES);
  }

  const configuredModuleIds = new Set(allConfigs.map((c) => c.module_id));
  const enabledConfiguredIds = allConfigs
    .filter((c) => c.is_enabled)
    .map((c) => c.module_id as ModuleId);

  // Combine enabled configured + default unconfigured
  const enabled = [
    ...enabledConfiguredIds,
    ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
  ];

  return filterMemberAccess(supabase, authContext, enabled);
}

async function filterMemberAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authContext: Awaited<ReturnType<typeof getAuthContext>>,
  enabled: ModuleId[]
): Promise<ModuleId[]> {
  const memberId = authContext?.activeMemberId || authContext?.defaultMemberId;
  if (!memberId) {
    return enabled;
  }

  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('id', memberId)
    .single();

  if (member?.role !== 'CHILD') {
    return enabled;
  }

  const { data: accessRows } = await supabase
    .from('member_module_access')
    .select('module_id, has_access')
    .eq('member_id', memberId);

  if (!accessRows || accessRows.length === 0) {
    return enabled;
  }

  const allowed = new Set(
    accessRows.filter((row) => row.has_access).map((row) => row.module_id)
  );
  return enabled.filter((moduleId) => allowed.has(moduleId));
}
