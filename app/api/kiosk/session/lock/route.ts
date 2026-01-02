import { NextRequest, NextResponse } from 'next/server';
import { lockKioskSession, getKioskSession } from '@/lib/kiosk-session';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/lock
 *
 * Manually lock kiosk (end member authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Get kiosk token from header
    const kioskToken = request.headers.get('X-Kiosk-Token');
    if (!kioskToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session exists
    const session = await getKioskSession(kioskToken);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Lock session
    await lockKioskSession(kioskToken);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.familyId,
        memberId: session.currentMemberId,
        action: 'KIOSK_AUTO_LOCKED',
        entityType: 'KIOSK',
        entityId: session.id,
        result: 'SUCCESS',
        metadata: {
          reason: 'Manual lock',
        },
      },
    });

    logger.info('Kiosk session locked', {
      familyId: session.familyId,
      sessionId: session.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error locking kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to lock session' },
      { status: 500 }
    );
  }
}
