import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getModuleConfigurations, updateModuleConfiguration } from '@/lib/data/settings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view module configurations
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const configurations = await getModuleConfigurations(familyId);

    // Define all available modules with metadata
    const allModules = [
      // Tasks
      { moduleId: 'CHORES', name: 'Chores', description: 'Assign and track household chores', category: 'Tasks' },
      { moduleId: 'TODOS', name: 'To-Dos', description: 'Personal and family task lists', category: 'Tasks' },
      { moduleId: 'ROUTINES', name: 'Routines', description: 'Morning routines and checklists', category: 'Tasks' },
      { moduleId: 'PROJECTS', name: 'Projects', description: 'Family projects and collaborative tasks', category: 'Tasks' },
      
      // Planning
      { moduleId: 'CALENDAR', name: 'Calendar', description: 'Family calendar and events', category: 'Planning' },
      { moduleId: 'MEAL_PLANNING', name: 'Meal Planning', description: 'Weekly meal plans and menus', category: 'Planning' },
      { moduleId: 'RECIPES', name: 'Recipes', description: 'Recipe collection and management', category: 'Planning' },
      { moduleId: 'SHOPPING', name: 'Shopping List', description: 'Shared shopping lists', category: 'Planning' },
      { moduleId: 'TRANSPORT', name: 'Transport', description: 'Carpool and transportation scheduling', category: 'Planning' },
      
      // Management
      { moduleId: 'INVENTORY', name: 'Inventory', description: 'Household inventory tracking', category: 'Management' },
      { moduleId: 'MAINTENANCE', name: 'Maintenance', description: 'Home maintenance tracking', category: 'Management' },
      { moduleId: 'DOCUMENTS', name: 'Documents', description: 'Family document storage', category: 'Management' },
      { moduleId: 'PETS', name: 'Pets', description: 'Pet care and tracking', category: 'Management' },
      
      // Rewards
      { moduleId: 'CREDITS', name: 'Credits', description: 'Family currency and rewards', category: 'Rewards' },
      { moduleId: 'LEADERBOARD', name: 'Leaderboard', description: 'Family achievements leaderboard', category: 'Rewards' },
      { moduleId: 'SCREEN_TIME', name: 'Screen Time', description: 'Screen time management', category: 'Rewards' },
      
      // Health
      { moduleId: 'HEALTH', name: 'Health', description: 'Health tracking and records', category: 'Health' },
      
      // Communication
      { moduleId: 'COMMUNICATION', name: 'Communication Board', description: 'Family message board', category: 'Communication' },
      
      // Financial
      { moduleId: 'FINANCIAL', name: 'Financial', description: 'Budget and expense tracking', category: 'Financial' },
      
      // Automation
      { moduleId: 'RULES_ENGINE', name: 'Rules & Automation', description: 'Automated family rules', category: 'Automation' },
    ];

    // Merge with configurations from database
    const modules = allModules.map(module => {
      const config = configurations.find(c => c.module_id === module.moduleId);
      return {
        moduleId: module.moduleId,
        name: module.name,
        description: module.description,
        category: module.category,
        isEnabled: config?.is_enabled ?? true, // Default to enabled if no config
        enabledAt: config?.enabled_at || null,
        disabledAt: config?.disabled_at || null,
        updatedAt: config?.updated_at || null,
      };
    });

    // Group by category
    const categories: Record<string, typeof modules> = {};
    modules.forEach(module => {
      if (!categories[module.category]) {
        categories[module.category] = [];
      }
      categories[module.category].push(module);
    });

    return NextResponse.json({ modules, categories });
  } catch (error) {
    logger.error('Get module configurations error:', error);
    return NextResponse.json({ error: 'Failed to get module configurations' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update module configurations
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { moduleId, isEnabled } = body;

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    const result = await updateModuleConfiguration(familyId, moduleId, { is_enabled: isEnabled });

    return NextResponse.json({
      success: true,
      module: result,
      message: 'Module configuration updated successfully',
    });
  } catch (error) {
    logger.error('Update module configuration error:', error);
    return NextResponse.json({ error: 'Failed to update module configuration' }, { status: 500 });
  }
}
