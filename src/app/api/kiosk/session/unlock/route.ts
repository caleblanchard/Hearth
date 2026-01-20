import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unlockKioskSession, getKioskSession } from '@/lib/data/kiosk';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/unlock
 *
 * Authenticate member via PIN to unlock kiosk
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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
    await supabase.from('audit_logs').insert({
      family_id: session.family_id,
      member_id: memberId,
      action: 'KIOSK_MEMBER_SWITCHED',
      entity_type: 'KIOSK',
      entity_id: session.id,
      result: 'SUCCESS',
      metadata: {
        memberId: updatedSession?.current_member_id,
      },
    });

    logger.info('Kiosk session unlocked', {
      familyId: session.family_id,
      sessionId: session.id,
      memberId,
    });

    return NextResponse.json({
      success: true,
      memberId: updatedSession?.current_member_id,
    });
  } catch (error) {
    logger.error('Error unlocking kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to unlock session' },
      { status: 500 }
    );
  }
}
