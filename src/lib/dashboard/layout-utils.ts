import { ModuleId, Role } from '@/app/generated/prisma';
import {
  DashboardLayoutData,
  WidgetConfig,
  WidgetId,
} from '@/types/dashboard';
import {
  WIDGET_REGISTRY,
  DEFAULT_WIDGET_ORDER,
  getAvailableWidgets,
} from './widget-registry';

/**
 * Generate default dashboard layout for a user based on enabled modules
 */
export function generateDefaultLayout(
  enabledModules: Set<ModuleId>,
  role: Role
): DashboardLayoutData {
  const availableWidgets = getAvailableWidgets(enabledModules, role);
  const availableWidgetIds = new Set(availableWidgets.map((w) => w.id));

  // Filter default order to only include available widgets
  const orderedWidgetIds = DEFAULT_WIDGET_ORDER.filter((id) =>
    availableWidgetIds.has(id)
  );

  // Add any widgets not in DEFAULT_WIDGET_ORDER at the end
  availableWidgets.forEach((widget) => {
    if (!orderedWidgetIds.includes(widget.id as WidgetId)) {
      orderedWidgetIds.push(widget.id as WidgetId);
    }
  });

  const widgets: WidgetConfig[] = orderedWidgetIds.map((id, index) => {
    const metadata = WIDGET_REGISTRY[id];
    return {
      id,
      enabled: true,
      order: index,
      size: metadata.defaultSize,
      settings: {},
    };
  });

  return { widgets };
}

/**
 * Validate and normalize a dashboard layout
 * Ensures order values are sequential, removes invalid widgets, etc.
 */
export function validateLayout(
  layout: DashboardLayoutData,
  enabledModules: Set<ModuleId>,
  role: Role
): DashboardLayoutData {
  const availableWidgets = getAvailableWidgets(enabledModules, role);
  const availableWidgetIds = new Set(availableWidgets.map((w) => w.id));

  // Filter out widgets that are no longer available
  let validWidgets = layout.widgets.filter((widget) =>
    availableWidgetIds.has(widget.id)
  );

  // Remove duplicates (keep first occurrence)
  const seenIds = new Set<string>();
  validWidgets = validWidgets.filter((widget) => {
    if (seenIds.has(widget.id)) {
      return false;
    }
    seenIds.add(widget.id);
    return true;
  });

  // Sort by order and re-index to ensure sequential ordering
  validWidgets.sort((a, b) => a.order - b.order);
  validWidgets = validWidgets.map((widget, index) => ({
    ...widget,
    order: index,
  }));

  return { widgets: validWidgets };
}

/**
 * Merge user layout with available widgets
 * Adds new widgets that weren't in the user's layout
 */
export function mergeLayoutWithAvailableWidgets(
  userLayout: DashboardLayoutData,
  enabledModules: Set<ModuleId>,
  role: Role
): DashboardLayoutData {
  const availableWidgets = getAvailableWidgets(enabledModules, role);
  const userWidgetIds = new Set(userLayout.widgets.map((w) => w.id));

  // Find new widgets not in user's layout
  const newWidgets = availableWidgets
    .filter((widget) => !userWidgetIds.has(widget.id))
    .map((widget, index) => ({
      id: widget.id,
      enabled: true, // New widgets are enabled by default
      order: userLayout.widgets.length + index,
      size: widget.defaultSize,
      settings: {},
    }));

  return {
    widgets: [...userLayout.widgets, ...newWidgets],
  };
}

/**
 * Sort widgets by their order value
 */
export function sortWidgetsByOrder(widgets: WidgetConfig[]): WidgetConfig[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}

/**
 * Get only enabled widgets
 */
export function getEnabledWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets.filter((w) => w.enabled);
}

/**
 * Validate widget size is appropriate for the widget type
 */
export function validateWidgetSize(
  widgetId: WidgetId,
  size: string
): boolean {
  const validSizes = ['default', 'wide', 'narrow'];
  if (!validSizes.includes(size)) {
    return false;
  }

  // Widget-specific validation could go here
  // For now, all widgets support all sizes
  return true;
}
