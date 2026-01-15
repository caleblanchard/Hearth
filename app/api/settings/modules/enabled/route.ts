import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getEnabledModules } from '@/lib/data/settings';
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

    const enabledModules = await getEnabledModules(familyId);

    return NextResponse.json({ enabledModules });
  } catch (error) {
    logger.error('Get enabled modules error:', error);
    return NextResponse.json({ error: 'Failed to get enabled modules' }, { status: 500 });
  }
}
