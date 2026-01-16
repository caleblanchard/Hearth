import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/data/notifications';
import { logger } from '@/lib/logger';

// Default preferences
const DEFAULT_PREFERENCES = {
  enabled_types: [],
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  push_enabled: true,
  in_app_enabled: true,
  leftover_expiring_hours: 24,
  document_expiring_days: 90,
  carpool_reminder_minutes: 30,
};

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authContext.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    const preferences = await getNotificationPreferences(userId);

    // Return preferences or defaults if none exist
    return NextResponse.json({
      preferences: preferences || DEFAULT_PREFERENCES,
    });
  } catch (error) {
    logger.error('Fetch notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authContext.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    const body = await request.json();

    // Validate quiet hours format if provided
    if (body.quiet_hours_start && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(body.quiet_hours_start)) {
      return NextResponse.json({ error: 'Invalid quiet hours start format (use HH:MM)' }, { status: 400 });
    }
    if (body.quiet_hours_end && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(body.quiet_hours_end)) {
      return NextResponse.json({ error: 'Invalid quiet hours end format (use HH:MM)' }, { status: 400 });
    }

    const preferences = await updateNotificationPreferences(userId, body);

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
