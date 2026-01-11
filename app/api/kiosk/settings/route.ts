import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemberInFamily, isParentInFamily } from '@/lib/supabase/server';
import { getOrCreateKioskSettings, updateKioskSettings } from '@/lib/data/kiosk';
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
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get familyId from query param
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    
    if (!familyId) {
      return NextResponse.json({ error: 'Missing familyId' }, { status: 400 });
    }

    // Only parents can manage kiosk settings
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage kiosk settings' },
        { status: 403 }
      );
    }

    // Get or create default settings
    const settings = await getOrCreateKioskSettings(familyId);

    logger.info('Retrieved kiosk settings', {
      familyId,
      settingsId: settings.id,
    });

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
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      familyId,
      isEnabled,
      autoLockMinutes,
      enabledWidgets,
      allowGuestView,
      requirePinForSwitch,
    } = body;

    if (!familyId) {
      return NextResponse.json({ error: 'Missing familyId' }, { status: 400 });
    }

    // Only parents can manage kiosk settings
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage kiosk settings' },
        { status: 403 }
      );
    }

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
    if (isEnabled !== undefined) updateData.is_enabled = isEnabled;
    if (autoLockMinutes !== undefined)
      updateData.auto_lock_minutes = autoLockMinutes;
    if (enabledWidgets !== undefined) updateData.enabled_widgets = enabledWidgets;
    if (allowGuestView !== undefined) updateData.allow_guest_view = allowGuestView;
    if (requirePinForSwitch !== undefined)
      updateData.require_pin_for_switch = requirePinForSwitch;

    // Ensure settings exist first
    await getOrCreateKioskSettings(familyId);

    // Update settings
    const settings = await updateKioskSettings(familyId, updateData);

    // Get member record for audit log
    const member = await getMemberInFamily(familyId);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: member?.id,
      action: 'KIOSK_SETTINGS_UPDATED',
      entity_type: 'KIOSK_SETTINGS',
      entity_id: settings.id,
      result: 'SUCCESS',
      metadata: {
        changes: updateData,
      },
    });

    logger.info('Kiosk settings updated', {
      familyId,
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
