import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_WIDGETS = [
  'transport',
  'medication',
  'maintenance',
  'inventory',
  'weather',
];

/**
 * GET /api/kiosk/settings
 *
 * Get kiosk settings for family
 * Only parents can access settings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage kiosk settings
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage kiosk settings' },
        { status: 403 }
      );
    }

    // Get or create default settings
    let settings = await prisma.kioskSettings.findUnique({
      where: { familyId: session.user.familyId },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.kioskSettings.create({
        data: {
          familyId: session.user.familyId,
          isEnabled: true,
          autoLockMinutes: 15,
          enabledWidgets: VALID_WIDGETS,
          allowGuestView: true,
          requirePinForSwitch: true,
        },
      });

      logger.info('Created default kiosk settings', {
        familyId: session.user.familyId,
        settingsId: settings.id,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Error getting kiosk settings', error);
    return NextResponse.json(
      { error: 'Failed to get kiosk settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/kiosk/settings
 *
 * Update kiosk settings
 * Only parents can update settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage kiosk settings
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage kiosk settings' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      isEnabled,
      autoLockMinutes,
      enabledWidgets,
      allowGuestView,
      requirePinForSwitch,
    } = body;

    // Validate autoLockMinutes if provided
    if (autoLockMinutes !== undefined && autoLockMinutes <= 0) {
      return NextResponse.json(
        { error: 'Auto-lock minutes must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate enabledWidgets if provided
    if (enabledWidgets !== undefined) {
      const invalidWidgets = enabledWidgets.filter(
        (widget: string) => !VALID_WIDGETS.includes(widget)
      );
      if (invalidWidgets.length > 0) {
        return NextResponse.json(
          { error: 'Invalid widget names' },
          { status: 400 }
        );
      }
    }

    // Build update data (only include fields that are provided)
    const updateData: any = {};
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (autoLockMinutes !== undefined)
      updateData.autoLockMinutes = autoLockMinutes;
    if (enabledWidgets !== undefined) updateData.enabledWidgets = enabledWidgets;
    if (allowGuestView !== undefined) updateData.allowGuestView = allowGuestView;
    if (requirePinForSwitch !== undefined)
      updateData.requirePinForSwitch = requirePinForSwitch;

    // Upsert settings
    const settings = await prisma.kioskSettings.upsert({
      where: { familyId: session.user.familyId },
      create: {
        familyId: session.user.familyId,
        ...updateData,
      },
      update: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'KIOSK_SETTINGS_UPDATED',
        entityType: 'KIOSK_SETTINGS',
        entityId: settings.id,
        result: 'SUCCESS',
        metadata: {
          changes: updateData,
        },
      },
    });

    logger.info('Kiosk settings updated', {
      familyId: session.user.familyId,
      settingsId: settings.id,
      changes: updateData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Error updating kiosk settings', error);
    return NextResponse.json(
      { error: 'Failed to update kiosk settings' },
      { status: 500 }
    );
  }
}
