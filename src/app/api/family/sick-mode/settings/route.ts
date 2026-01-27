import { NextRequest, NextResponse} from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getSickModeSettings, updateSickModeSettings } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const settings = await getSickModeSettings(familyId);

    if (!settings) {
      const newSettings = await updateSickModeSettings(familyId, {});
      return NextResponse.json({ settings: newSettings });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Get sick mode settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (typeof body.temperatureThreshold !== 'undefined') {
      if (typeof body.temperatureThreshold !== 'number' || body.temperatureThreshold <= 0) {
        return NextResponse.json({ error: 'Temperature threshold must be a positive number' }, { status: 400 });
      }
    }

    if (typeof body.screenTimeBonus !== 'undefined') {
      if (typeof body.screenTimeBonus !== 'number' || body.screenTimeBonus < 0) {
        return NextResponse.json({ error: 'Screen time bonus must be a non-negative number' }, { status: 400 });
      }
    }

    // Map camelCase to snake_case for the data layer if needed, or update data layer to handle it.
    // health.ts accepts an object and spreads it.
    // But health.ts expects snake_case keys in the spread?
    // updateSickModeSettings expects:
    // pause_chores, pause_screen_time_tracking, screen_time_bonus, etc.
    // The body probably contains camelCase keys like temperatureThreshold.
    // We should map them.
    
    const dbSettings: any = {};
    if (typeof body.pauseChores !== 'undefined') dbSettings.pause_chores = body.pauseChores;
    if (typeof body.pauseScreenTimeTracking !== 'undefined') dbSettings.pause_screen_time_tracking = body.pauseScreenTimeTracking;
    if (typeof body.screenTimeBonus !== 'undefined') dbSettings.screen_time_bonus = body.screenTimeBonus;
    if (typeof body.skipMorningRoutine !== 'undefined') dbSettings.skip_morning_routine = body.skipMorningRoutine;
    if (typeof body.skipBedtimeRoutine !== 'undefined') dbSettings.skip_bedtime_routine = body.skipBedtimeRoutine;
    if (typeof body.muteNonEssentialNotifs !== 'undefined') dbSettings.mute_non_essential_notifs = body.muteNonEssentialNotifs;
    if (typeof body.temperatureThreshold !== 'undefined') dbSettings.temperature_threshold = body.temperatureThreshold;

    const currentSettings = await getSickModeSettings(familyId);
    const settings = await updateSickModeSettings(familyId, dbSettings);

    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'SICK_MODE_SETTINGS_UPDATED',
      entity_type: 'SickModeSettings',
      entity_id: settings.id,
      result: 'SUCCESS',
      details: {
        previousValue: currentSettings,
        newValue: settings,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: 'Sick mode settings updated successfully',
    });
  } catch (error) {
    logger.error('Update sick mode settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
