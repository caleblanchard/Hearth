import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { syncCalendarSubscription } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const result = await syncCalendarSubscription(id, familyId);

    return NextResponse.json({
      success: result.success,
      eventsCreated: result.eventsCreated,
      eventsUpdated: result.eventsUpdated,
      eventsDeleted: result.eventsDeleted,
      error: result.error,
      message: result.success ? 'Calendar synced successfully' : 'Sync completed with errors',
    });
  } catch (error) {
    logger.error('Sync calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to sync calendar' }, { status: 500 });
  }
}
