import { ModuleId, Role } from '@/app/generated/prisma';

/**
 * Widget size configuration
 */
export type WidgetSize = 'default' | 'wide' | 'narrow';

/**
 * Individual widget configuration in a dashboard layout
 */
export interface WidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
  size: WidgetSize;
  settings?: Record<string, any>;
}

/**
 * Complete dashboard layout structure stored in database
 */
export interface DashboardLayoutData {
  widgets: WidgetConfig[];
}

/**
 * Widget metadata for registry
 */
export interface WidgetMetadata {
  id: string;
  name: string;
  description: string;
  defaultSize: WidgetSize;
  requiredModule?: ModuleId;
  minRole?: Role;
  category?: 'personal' | 'family' | 'system';
}

/**
 * Available widget IDs
 */
export type WidgetId =
  | 'chores'
  | 'screentime'
  | 'credits'
  | 'shopping'
  | 'todos'
  | 'calendar'
  | 'projects'
  | 'transport'
  | 'communication'
  | 'weather'
  | 'medication'
  | 'maintenance'
  | 'inventory'
  | 'meals';

/**
 * API response for GET /api/dashboard/layout
 */
export interface DashboardLayoutResponse {
  layout: DashboardLayoutData;
  availableWidgets: WidgetMetadata[];
}

/**
 * API request for PUT /api/dashboard/layout
 */
export interface UpdateDashboardLayoutRequest {
  widgets: WidgetConfig[];
}
