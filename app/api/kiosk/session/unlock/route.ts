import { NextRequest, NextResponse } from 'next/server';
import { unlockKioskSession, getKioskSession } from '@/lib/kiosk-session';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/unlock
 *
 * Authenticate member via PIN to unlock kiosk
 */
export async function POST(request: NextRequest) {
  try {
    // Get kiosk token from header
    const kioskToken = request.headers.get('X-Kiosk-Token');
    if (!kioskToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { memberId, pin } = body;

    if (!memberId || !pin) {
      return NextResponse.json(
        { error: 'Missing memberId or pin' },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await getKioskSession(kioskToken);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Attempt to unlock
    const result = await unlockKioskSession(kioskToken, memberId, pin);

    if (!result.success) {
      const errorStatus = result.error === 'Member not in session family' ? 403 : 400;
      return NextResponse.json({ error: result.error }, { status: errorStatus });
    }

    // Get updated session with member info
    const updatedSession = await getKioskSession(kioskToken);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.familyId,
        memberId,
        action: 'KIOSK_MEMBER_SWITCHED',
        entityType: 'KIOSK',
        entityId: session.id,
        result: 'SUCCESS',
        metadata: {
          memberName: updatedSession?.currentMember?.name,
        },
      },
    });

    logger.info('Kiosk session unlocked', {
      familyId: session.familyId,
      sessionId: session.id,
      memberId,
    });

    return NextResponse.json({
      success: true,
      member: updatedSession?.currentMember,
    });
  } catch (error) {
    logger.error('Error unlocking kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to unlock session' },
      { status: 500 }
    );
  }
}
