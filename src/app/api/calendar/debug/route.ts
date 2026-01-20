import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarDebugInfo } from '@/lib/data/calendar';
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

    const debugInfo = await getCalendarDebugInfo(familyId);

    return NextResponse.json({ debugInfo });
  } catch (error) {
    logger.error('Calendar debug error:', error);
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 });
  }
}
