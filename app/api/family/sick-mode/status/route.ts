import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getSickModeStatus } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || undefined;
    const includeEnded = searchParams.get('includeEnded') === 'true';

    const instances = await getSickModeStatus(familyId, memberId, includeEnded);

    return NextResponse.json({ instances });
  } catch (error) {
    logger.error('Get sick mode status error:', error);
    return NextResponse.json({ error: 'Failed to get sick mode status' }, { status: 500 });
  }
}
