import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { generateDefaultLayout } from '@/lib/dashboard/layout-utils';
import { getAvailableWidgets } from '@/lib/dashboard/widget-registry';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/layout/reset
 * Reset user's dashboard layout to default
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: memberId, familyId, role } = session.user;

    // Delete user's saved layout
    try {
      await prisma.dashboardLayout.delete({
        where: { memberId },
      });
    } catch (error) {
      // It's okay if layout doesn't exist
      logger.debug('No layout to delete for user', { memberId });
    }

    // Fetch enabled modules
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
    logger.info('Reset dashboard - enabled modules', {
      familyId,
      memberId,
      role,
      moduleCount: enabledModules.size,
      modules: Array.from(enabledModules),
    });

    // Generate default layout
    const availableWidgets = getAvailableWidgets(enabledModules, role);
    const layout = generateDefaultLayout(enabledModules, role);

    // DEBUG: Log what we generated
    logger.info('Reset dashboard - generated layout', {
      availableWidgetCount: availableWidgets.length,
      availableWidgetIds: availableWidgets.map((w) => w.id),
      layoutWidgetCount: layout.widgets.length,
      layoutWidgetIds: layout.widgets.map((w) => w.id),
      enabledCount: layout.widgets.filter((w) => w.enabled).length,
    });

    return NextResponse.json({
      success: true,
      layout,
      availableWidgets,
    });
  } catch (error) {
    logger.error('Error resetting dashboard layout', error);
    return NextResponse.json(
      { error: 'Failed to reset dashboard layout' },
      { status: 500 }
    );
  }
}
