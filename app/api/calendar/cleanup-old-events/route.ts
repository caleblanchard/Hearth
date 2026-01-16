import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { cleanupOldCalendarEvents } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Only parents can cleanup events
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const result = await cleanupOldCalendarEvents(familyId);

    return NextResponse.json({
      success: true,
      result,
      message: 'Old calendar events cleaned up successfully',
    });
  } catch (error) {
    logger.error('Cleanup old events error:', error);
    return NextResponse.json({ error: 'Failed to cleanup old events' }, { status: 500 });
  }
}
