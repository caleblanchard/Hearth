import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKioskSession, endKioskSession, checkAutoLock, lockKioskSession } from '@/lib/kiosk-session';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/kiosk/session
 *
 * Get current kiosk session status
 * Checks for auto-lock timeout
 */
export async function GET(request: NextRequest) {
  try {
    // Get kiosk token from header
    const kioskToken = request.headers.get('X-Kiosk-Token');
    if (!kioskToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const session = await getKioskSession(kioskToken);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session should auto-lock
    const shouldLock = session.currentMemberId && checkAutoLock(session);
    if (shouldLock) {
      // Auto-lock the session
      const lockedSession = await lockKioskSession(kioskToken);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          familyId: session.familyId,
          action: 'KIOSK_AUTO_LOCKED',
          entityType: 'KIOSK',
          entityId: session.id,
          result: 'SUCCESS',
          metadata: {
            reason: 'Inactivity timeout',
            autoLockMinutes: session.autoLockMinutes,
          },
        },
      });

      return NextResponse.json({
        isActive: lockedSession.isActive,
        isLocked: true,
        currentMember: null,
        autoLockMinutes: lockedSession.autoLockMinutes,
        lastActivityAt: lockedSession.lastActivityAt,
      });
    }

    return NextResponse.json({
      isActive: session.isActive,
      isLocked: !session.currentMemberId,
      currentMemberId: session.currentMemberId,
      autoLockMinutes: session.autoLockMinutes,
      lastActivityAt: session.lastActivityAt,
    });
  } catch (error) {
    logger.error('Error getting kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to get kiosk session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kiosk/session
 *
 * End kiosk session
 * Requires parent PIN verification via kiosk session
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get kiosk token from header
    const kioskToken = request.headers.get('X-Kiosk-Token');
    if (!kioskToken) {
      return NextResponse.json({ error: 'Missing kiosk token' }, { status: 400 });
    }

    // Get kiosk session
    const kioskSession = await getKioskSession(kioskToken);
    if (!kioskSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If there's a current member, verify they are a parent
    if (kioskSession.currentMemberId) {
      const member = await prisma.familyMember.findUnique({
        where: { id: kioskSession.currentMemberId },
        select: { role: true },
      });

      if (!member || member.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Only parents can end kiosk sessions' },
          { status: 403 }
        );
      }
    } else {
      // If no one is logged in, anyone can end it (session is locked)
      // This allows cleanup of abandoned sessions
    }

    // End session
    await endKioskSession(kioskToken);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: kioskSession.familyId,
        memberId: kioskSession.currentMemberId || undefined,
        action: 'KIOSK_SESSION_ENDED',
        entityType: 'KIOSK',
        entityId: kioskSession.id,
        result: 'SUCCESS',
      },
    });

    logger.info('Kiosk session ended', {
      familyId: kioskSession.familyId,
      sessionId: kioskSession.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error ending kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to end kiosk session' },
      { status: 500 }
    );
  }
}
