import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lockKioskSession, getKioskSession } from '@/lib/data/kiosk';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/lock
 *
 * Manually lock kiosk (end member authentication)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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
    await supabase.from('audit_logs').insert({
      family_id: session.family_id,
      member_id: session.current_member_id,
      action: 'KIOSK_AUTO_LOCKED',
      entity_type: 'KIOSK',
      entity_id: session.id,
      result: 'SUCCESS',
      metadata: {
        reason: 'Manual lock',
      },
    });

    logger.info('Kiosk session locked', {
      familyId: session.family_id,
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
