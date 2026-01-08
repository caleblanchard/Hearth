import { ModuleId, Role } from '@/app/generated/prisma';
import { WidgetMetadata, WidgetId } from '@/types/dashboard';

/**
 * Central registry of all available dashboard widgets
 */
export const WIDGET_REGISTRY: Record<WidgetId, WidgetMetadata> = {
  chores: {
    id: 'chores',
    name: "Today's Chores",
    description: 'View and manage your daily chores',
    defaultSize: 'default',
    requiredModule: ModuleId.CHORES,
    category: 'personal',
  },
  screentime: {
    id: 'screentime',
    name: 'Screen Time',
    description: 'Track your screen time allowances',
    defaultSize: 'default',
    requiredModule: ModuleId.SCREEN_TIME,
    category: 'personal',
  },
  credits: {
    id: 'credits',
    name: 'Credits',
    description: 'View your credit balance and history',
    defaultSize: 'default',
    requiredModule: ModuleId.CREDITS,
    category: 'personal',
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping List',
    description: 'View and manage family shopping list',
    defaultSize: 'default',
    requiredModule: ModuleId.SHOPPING,
    category: 'family',
  },
  todos: {
    id: 'todos',
    name: 'To-Do List',
    description: 'Track your personal tasks and to-dos',
    defaultSize: 'default',
    requiredModule: ModuleId.TODOS,
    category: 'personal',
  },
  calendar: {
    id: 'calendar',
    name: 'Upcoming Events',
    description: 'View upcoming calendar events',
    defaultSize: 'default',
    requiredModule: ModuleId.CALENDAR,
    category: 'family',
  },
  projects: {
    id: 'projects',
    name: 'My Project Tasks',
    description: 'View tasks assigned to you across projects',
    defaultSize: 'default',
    requiredModule: ModuleId.PROJECTS,
    category: 'personal',
  },
  transport: {
    id: 'transport',
    name: 'Transport',
    description: "View today's transportation schedules",
    defaultSize: 'wide',
    requiredModule: ModuleId.TRANSPORT,
    category: 'family',
  },
  communication: {
    id: 'communication',
    name: 'Recent Messages',
    description: 'Recent family posts and updates',
    defaultSize: 'default',
    requiredModule: ModuleId.COMMUNICATION,
    category: 'family',
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather and forecast',
    defaultSize: 'default',
    category: 'system',
  },
  medication: {
    id: 'medication',
    name: 'Medications',
    description: 'Track medication schedules and reminders',
    defaultSize: 'default',
    requiredModule: ModuleId.HEALTH,
    category: 'personal',
  },
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance Tasks',
    description: 'Upcoming home maintenance items',
    defaultSize: 'default',
    requiredModule: ModuleId.MAINTENANCE,
    category: 'family',
  },
  inventory: {
    id: 'inventory',
    name: 'Low Stock Inventory',
    description: 'Items running low in household inventory',
    defaultSize: 'default',
    requiredModule: ModuleId.INVENTORY,
    category: 'family',
  },
  meals: {
    id: 'meals',
    name: "Today's Meals",
    description: 'View meal plans and recipes',
    defaultSize: 'default',
    requiredModule: ModuleId.MEAL_PLANNING,
    category: 'family',
  },
};

/**
 * Get all available widgets for a given role and enabled modules
 */
export function getAvailableWidgets(
  enabledModules: Set<ModuleId>,
  role: Role
): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => {
    // Check if widget requires a module
    if (widget.requiredModule && !enabledModules.has(widget.requiredModule)) {
      return false;
    }

    // Check role requirement (if any)
    if (widget.minRole) {
      // Role hierarchy: PARENT > CHILD > GUEST
      const roleHierarchy = { PARENT: 3, CHILD: 2, GUEST: 1 };
      if (roleHierarchy[role] < roleHierarchy[widget.minRole]) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Default widget order (suggested priority)
 */
export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'chores',
  'screentime',
  'calendar',
  'todos',
  'shopping',
  'credits',
  'projects',
  'transport',
  'communication',
  'weather',
  'medication',
  'meals',
  'maintenance',
  'inventory',
];
