import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemberInFamily, isParentInFamily } from '@/lib/supabase/server';
import { createKioskSession, getOrCreateKioskSettings } from '@/lib/data/kiosk';
import { logger } from '@/lib/logger';

/**
 * POST /api/kiosk/session/start
 *
 * Initialize a new kiosk session for a device
 * Only parents can start kiosk sessions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { deviceId, familyId } = body;

    // Verify user is a parent in the family
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can start kiosk sessions' },
        { status: 403 }
      );
    }

    // Get kiosk settings
    const settings = await getOrCreateKioskSettings(familyId);

    // Check if kiosk is enabled
    if (!settings.is_enabled) {
      return NextResponse.json(
        { error: 'Kiosk mode is disabled for this family' },
        { status: 403 }
      );
    }

    // Create kiosk session
    const kioskSession = await createKioskSession(deviceId, familyId);

    // Get member record for audit log
    const member = await getMemberInFamily(familyId);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: member?.id,
      action: 'KIOSK_SESSION_STARTED',
      entity_type: 'KIOSK',
      entity_id: kioskSession.id,
      result: 'SUCCESS',
      metadata: {
        deviceId,
        sessionToken: kioskSession.session_token,
      },
    });

    logger.info('Kiosk session started', {
      familyId,
      deviceId,
      sessionId: kioskSession.id,
    });

    return NextResponse.json({
      sessionToken: kioskSession.session_token,
      autoLockMinutes: settings.auto_lock_minutes,
      enabledWidgets: settings.enabled_widgets,
    });
  } catch (error) {
    logger.error('Error starting kiosk session', error);
    return NextResponse.json(
      { error: 'Failed to start kiosk session' },
      { status: 500 }
    );
  }
}
