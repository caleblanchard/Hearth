import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModuleId } from '@/app/generated/prisma';

// All configurable modules (excludes RULES_ENGINE per requirements)
const CONFIGURABLE_MODULES: ModuleId[] = [
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

// Module metadata for display
const MODULE_INFO: Record<ModuleId, { name: string; description: string; category: string }> = {
  CHORES: {
    name: 'Chores',
    description: 'Assign and track household chores',
    category: 'Tasks',
  },
  SCREEN_TIME: {
    name: 'Screen Time',
    description: 'Manage screen time limits and usage',
    category: 'Management',
  },
  CREDITS: {
    name: 'Rewards & Credits',
    description: 'Earn and spend family credits',
    category: 'Rewards',
  },
  SHOPPING: {
    name: 'Shopping Lists',
    description: 'Create and manage shopping lists',
    category: 'Tasks',
  },
  CALENDAR: {
    name: 'Calendar',
    description: 'Family calendar and events',
    category: 'Planning',
  },
  TODOS: {
    name: 'To-Do Lists',
    description: 'Personal to-do lists',
    category: 'Tasks',
  },
  ROUTINES: {
    name: 'Routines',
    description: 'Morning and bedtime routines',
    category: 'Planning',
  },
  MEAL_PLANNING: {
    name: 'Meal Planning',
    description: 'Plan meals and manage recipes',
    category: 'Planning',
  },
  RECIPES: {
    name: 'Recipes',
    description: 'Recipe collection and management',
    category: 'Planning',
  },
  INVENTORY: {
    name: 'Inventory',
    description: 'Track household inventory',
    category: 'Management',
  },
  HEALTH: {
    name: 'Health & Wellness',
    description: 'Track health events and medical information',
    category: 'Health',
  },
  PROJECTS: {
    name: 'Projects',
    description: 'Family projects and goals',
    category: 'Planning',
  },
  COMMUNICATION: {
    name: 'Communication Board',
    description: 'Family messages and announcements',
    category: 'Communication',
  },
  TRANSPORT: {
    name: 'Transportation',
    description: 'Manage rides and transportation',
    category: 'Management',
  },
  PETS: {
    name: 'Pet Care',
    description: 'Track pet care tasks and information',
    category: 'Management',
  },
  MAINTENANCE: {
    name: 'Home Maintenance',
    description: 'Track home maintenance tasks',
    category: 'Tasks',
  },
  DOCUMENTS: {
    name: 'Documents',
    description: 'Store and share family documents',
    category: 'Management',
  },
  FINANCIAL: {
    name: 'Financial Management',
    description: 'Budgets, transactions, and savings goals',
    category: 'Financial',
  },
  LEADERBOARD: {
    name: 'Leaderboard',
    description: 'Family achievement leaderboard',
    category: 'Rewards',
  },
  RULES_ENGINE: {
    name: 'Automation Rules',
    description: 'Automate household tasks',
    category: 'Advanced',
  },
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can view module settings
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can view module settings' },
        { status: 403 }
      );
    }

    // Get existing module configurations
    const existingConfigs = await prisma.moduleConfiguration.findMany({
      where: { familyId: session.user.familyId },
      select: {
        moduleId: true,
        isEnabled: true,
        enabledAt: true,
        disabledAt: true,
        updatedAt: true,
      },
    });

    // Build complete module list with configurations
    const modules = CONFIGURABLE_MODULES.map((moduleId) => {
      const config = existingConfigs.find((c) => c.moduleId === moduleId);
      const info = MODULE_INFO[moduleId];

      return {
        moduleId,
        name: info.name,
        description: info.description,
        category: info.category,
        isEnabled: config?.isEnabled ?? true, // Default to enabled
        enabledAt: config?.enabledAt,
        disabledAt: config?.disabledAt,
        updatedAt: config?.updatedAt,
      };
    });

    // Group by category
    const categories = modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, typeof modules>);

    return NextResponse.json({ modules, categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching module configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module configurations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update module settings
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update module settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { moduleId, isEnabled } = body;

    // Validate module ID
    if (!moduleId || !CONFIGURABLE_MODULES.includes(moduleId)) {
      return NextResponse.json(
        { error: 'Invalid or non-configurable module ID' },
        { status: 400 }
      );
    }

    // Validate isEnabled
    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'isEnabled must be a boolean' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Upsert module configuration
    const config = await prisma.moduleConfiguration.upsert({
      where: {
        familyId_moduleId: {
          familyId: session.user.familyId,
          moduleId,
        },
      },
      create: {
        familyId: session.user.familyId,
        moduleId,
        isEnabled,
        enabledAt: isEnabled ? now : null,
        disabledAt: isEnabled ? null : now,
      },
      update: {
        isEnabled,
        enabledAt: isEnabled ? now : undefined,
        disabledAt: isEnabled ? undefined : now,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: isEnabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
        entityType: 'ModuleConfiguration',
        entityId: config.id,
        metadata: { moduleId },
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    console.error('Error updating module configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update module configuration' },
      { status: 500 }
    );
  }
}
