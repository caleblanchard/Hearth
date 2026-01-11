import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logScreenTimeSession } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const {
      minutes: rawMinutes,
      screenTimeTypeId: rawScreenTimeTypeId,
      deviceType: rawDeviceType,
      notes: rawNotes,
    } = bodyResult.data;

    // Sanitize and validate input
    const minutes = sanitizeInteger(rawMinutes, 1);
    if (minutes === null) {
      return NextResponse.json(
        { error: 'Valid minutes value is required' },
        { status: 400 }
      );
    }

    const screenTimeTypeId = sanitizeString(rawScreenTimeTypeId);
    if (!screenTimeTypeId) {
      return NextResponse.json(
        { error: 'Screen time type ID is required' },
        { status: 400 }
      );
    }

    const session = await logScreenTimeSession(memberId, screenTimeTypeId, minutes, {
      deviceType: rawDeviceType ? sanitizeString(rawDeviceType) : null,
      notes: rawNotes ? sanitizeString(rawNotes) : null,
    });

    return NextResponse.json({
      success: true,
      session,
      message: 'Screen time logged successfully',
    });
  } catch (error) {
    logger.error('Screen time logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log screen time' },
      { status: 500 }
    );
  }
}
