import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKioskSession, endKioskSession, checkAutoLock, lockKioskSession } from '@/lib/data/kiosk';
import { logger } from '@/lib/logger';

/**
 * GET /api/kiosk/session
 *
 * Get current kiosk session status
 * Checks for auto-lock timeout
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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
    const shouldLock = session.current_member_id && checkAutoLock(session);
    if (shouldLock) {
      // Auto-lock the session
      const lockedSession = await lockKioskSession(kioskToken);

      // Create audit log
      await supabase.from('audit_logs').insert({
        family_id: session.family_id,
        action: 'KIOSK_AUTO_LOCKED',
        entity_type: 'KIOSK',
        entity_id: session.id,
        result: 'SUCCESS',
        metadata: {
          reason: 'Inactivity timeout',
          autoLockMinutes: session.auto_lock_minutes,
        },
      });

      return NextResponse.json({
        isActive: lockedSession.is_active,
        isLocked: true,
        currentMember: null,
        autoLockMinutes: lockedSession.auto_lock_minutes,
        lastActivityAt: lockedSession.last_activity_at,
      });
    }

    return NextResponse.json({
      isActive: session.is_active,
      isLocked: !session.current_member_id,
      currentMemberId: session.current_member_id,
      autoLockMinutes: session.auto_lock_minutes,
      lastActivityAt: session.last_activity_at,
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
    const supabase = await createClient();

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
    if (kioskSession.current_member_id) {
      const { data: member } = await supabase
        .from('family_members')
        .select('role')
        .eq('id', kioskSession.current_member_id)
        .single();

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
    await supabase.from('audit_logs').insert({
      family_id: kioskSession.family_id,
      member_id: kioskSession.current_member_id,
      action: 'KIOSK_SESSION_ENDED',
      entity_type: 'KIOSK',
      entity_id: kioskSession.id,
      result: 'SUCCESS',
    });

    logger.info('Kiosk session ended', {
      familyId: kioskSession.family_id,
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
