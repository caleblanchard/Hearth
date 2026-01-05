import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModuleId } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

// All modules that should be enabled by default (if no config exists)
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get module configurations for this family
    const configs = await prisma.moduleConfiguration.findMany({
      where: {
        familyId: session.user.familyId,
        isEnabled: true,
      },
      select: {
        moduleId: true,
      },
    });

    // If no configurations exist, return defaults
    if (configs.length === 0) {
      return NextResponse.json(
        { enabledModules: DEFAULT_ENABLED_MODULES },
        { status: 200 }
      );
    }

    // Get all configured modules (both enabled and disabled)
    const allConfigs = await prisma.moduleConfiguration.findMany({
      where: { familyId: session.user.familyId },
      select: { moduleId: true, isEnabled: true },
    });

    // Build enabled modules list
    const configuredModuleIds = new Set(allConfigs.map((c) => c.moduleId));
    const enabledConfiguredIds = allConfigs
      .filter((c) => c.isEnabled)
      .map((c) => c.moduleId);

    // Add default-enabled modules that haven't been configured yet
    const enabledModules = [
      ...enabledConfiguredIds,
      ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
    ];

    return NextResponse.json({ enabledModules }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching enabled modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enabled modules' },
      { status: 500 }
    );
  }
}
