import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createKioskSession, getOrCreateKioskSettings } from '@/lib/kiosk-session';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/start
 *
 * Initialize a new kiosk session for a device
 * Only parents can start kiosk sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can start kiosk sessions
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can start kiosk sessions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { deviceId, familyId } = body;

    // Verify family ownership
    if (familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot start kiosk session for other families' },
        { status: 403 }
      );
    }

    // Get kiosk settings
    const settings = await getOrCreateKioskSettings(familyId);

    // Check if kiosk is enabled
    if (!settings.isEnabled) {
      return NextResponse.json(
        { error: 'Kiosk mode is disabled for this family' },
        { status: 403 }
      );
    }

    // Create kiosk session
    const kioskSession = await createKioskSession(deviceId, familyId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId,
        memberId: session.user.id,
        action: 'KIOSK_SESSION_STARTED',
        entityType: 'KIOSK',
        entityId: kioskSession.id,
        result: 'SUCCESS',
        metadata: {
          deviceId,
          sessionToken: kioskSession.sessionToken,
        },
      },
    });

    logger.info('Kiosk session started', {
      familyId,
      deviceId,
      sessionId: kioskSession.id,
    });

    return NextResponse.json({
      sessionToken: kioskSession.sessionToken,
      autoLockMinutes: settings.autoLockMinutes,
      enabledWidgets: settings.enabledWidgets,
    });
  } catch (error) {
    logger.error('Error starting kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to start kiosk session' },
      { status: 500 }
    );
  }
}
