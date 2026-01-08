import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ModuleId } from '@/app/generated/prisma';
import {
  generateDefaultLayout,
  validateLayout,
  mergeLayoutWithAvailableWidgets,
} from '@/lib/dashboard/layout-utils';
import { getAvailableWidgets, WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry';
import {
  DashboardLayoutData,
  UpdateDashboardLayoutRequest,
} from '@/types/dashboard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/layout
 * Fetch user's dashboard layout configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: memberId, familyId, role } = session.user;

    // Fetch enabled modules for the family
    const moduleConfigs = await prisma.moduleConfiguration.findMany({
      where: {
        familyId,
        isEnabled: true,
      },
      select: {
        moduleId: true,
      },
    });

    const enabledModules = new Set(moduleConfigs.map((m) => m.moduleId));

    // DEBUG: Log what we found
    logger.info('Get dashboard layout - enabled modules', {
      familyId,
      memberId,
      role,
      moduleCount: enabledModules.size,
      modules: Array.from(enabledModules),
    });

    // Fetch user's saved layout
    const savedLayout = await prisma.dashboardLayout.findUnique({
      where: { memberId },
    });

    let layout: DashboardLayoutData;

    if (savedLayout) {
      logger.info('Get dashboard layout - found saved layout', {
        widgetCount: (savedLayout.layout as any).widgets?.length,
      });

      // Validate and normalize saved layout
      layout = validateLayout(
        savedLayout.layout as unknown as DashboardLayoutData,
        enabledModules,
        role
      );

      // Merge with any new widgets that have become available
      layout = mergeLayoutWithAvailableWidgets(layout, enabledModules, role);
    } else {
      logger.info('Get dashboard layout - no saved layout, generating default');
      // Generate default layout
      layout = generateDefaultLayout(enabledModules, role);
    }

    // Get available widgets metadata
    const availableWidgets = getAvailableWidgets(enabledModules, role);

    // DEBUG: Log final result
    logger.info('Get dashboard layout - returning', {
      availableWidgetCount: availableWidgets.length,
      availableWidgetIds: availableWidgets.map((w) => w.id),
      layoutWidgetCount: layout.widgets.length,
      layoutWidgetIds: layout.widgets.map((w) => w.id),
      enabledCount: layout.widgets.filter((w) => w.enabled).length,
    });

    return NextResponse.json({
      layout,
      availableWidgets,
    });
  } catch (error) {
    logger.error('Error fetching dashboard layout', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard layout' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/layout
 * Update user's dashboard layout configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: memberId, familyId, role } = session.user;

    // Parse request body
    const body: UpdateDashboardLayoutRequest = await request.json();

    if (!body.widgets || !Array.isArray(body.widgets)) {
      return NextResponse.json(
        { error: 'Invalid request: widgets array required' },
        { status: 400 }
      );
    }

    // Fetch enabled modules for validation
    const moduleConfigs = await prisma.moduleConfiguration.findMany({
      where: {
        familyId,
        isEnabled: true,
      },
      select: {
        moduleId: true,
      },
    });

    const enabledModules = new Set(moduleConfigs.map((m) => m.moduleId));
    const availableWidgets = getAvailableWidgets(enabledModules, role);
    const availableWidgetIds = new Set(availableWidgets.map((w) => w.id));

    // Validate all widget IDs are valid
    const invalidWidgets = body.widgets.filter(
      (widget) => !WIDGET_REGISTRY[widget.id as keyof typeof WIDGET_REGISTRY]
    );

    if (invalidWidgets.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid widget IDs: ${invalidWidgets.map((w) => w.id).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate all widgets are available (module enabled, role permitted)
    const unavailableWidgets = body.widgets.filter(
      (widget) => !availableWidgetIds.has(widget.id)
    );

    if (unavailableWidgets.length > 0) {
      return NextResponse.json(
        {
          error: `Widgets not available: ${unavailableWidgets.map((w) => w.id).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const layoutData: DashboardLayoutData = { widgets: body.widgets };

    // Check if layout exists
    const existingLayout = await prisma.dashboardLayout.findUnique({
      where: { memberId },
    });

    if (existingLayout) {
      // Update existing layout
      await prisma.dashboardLayout.update({
        where: { memberId },
        data: { layout: layoutData as any },
      });
    } else {
      // Create new layout
      await prisma.dashboardLayout.create({
        data: {
          memberId,
          layout: layoutData as any,
        },
      });
    }

    return NextResponse.json({
      success: true,
      layout: layoutData,
    });
  } catch (error) {
    logger.error('Error updating dashboard layout', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard layout' },
      { status: 500 }
    );
  }
}
