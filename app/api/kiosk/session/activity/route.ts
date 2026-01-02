import { NextRequest, NextResponse } from 'next/server';
import { updateKioskActivity, getKioskSession } from '@/lib/kiosk-session';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/activity
 *
 * Update last activity timestamp (heartbeat)
 * Resets auto-lock timer
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

    // Update activity
    const updatedSession = await updateKioskActivity(kioskToken);

    return NextResponse.json({
      success: true,
      lastActivityAt: updatedSession.lastActivityAt,
    });
  } catch (error) {
    logger.error('Error updating kiosk activity', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
