import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModuleId } from '@/app/generated/prisma';

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

  // Check if there's a configuration for this module
  const config = await prisma.moduleConfiguration.findUnique({
    where: {
      familyId_moduleId: {
        familyId: session.user.familyId,
        moduleId,
      },
    },
    select: {
      isEnabled: true,
    },
  });

  // If no config exists, check if it's in default enabled list
  if (!config) {
    return DEFAULT_ENABLED_MODULES.includes(moduleId);
  }

  return config.isEnabled;
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

  const configs = await prisma.moduleConfiguration.findMany({
    where: {
      familyId: session.user.familyId,
      isEnabled: true,
    },
    select: {
      moduleId: true,
    },
  });

  // If no configurations exist, return all defaults
  if (configs.length === 0) {
    return DEFAULT_ENABLED_MODULES;
  }

  // Get all configured modules
  const allConfigs = await prisma.moduleConfiguration.findMany({
    where: { familyId: session.user.familyId },
    select: { moduleId: true, isEnabled: true },
  });

  const configuredModuleIds = new Set(allConfigs.map((c) => c.moduleId));
  const enabledConfiguredIds = allConfigs
    .filter((c) => c.isEnabled)
    .map((c) => c.moduleId);

  // Combine enabled configured + default unconfigured
  return [
    ...enabledConfiguredIds,
    ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
  ];
}
