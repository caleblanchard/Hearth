import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarConnections } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const connections = await getCalendarConnections(memberId);

    return NextResponse.json({ connections });
  } catch (error) {
    logger.error('Get calendar connections error:', error);
    return NextResponse.json({ error: 'Failed to get connections' }, { status: 500 });
  }
}
