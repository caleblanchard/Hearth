import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { getTodaysTransportSchedules } from '@/lib/data/transport';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const childAuth = authContext ? null : await authenticateChildSession();
    const deviceAuth = authContext || childAuth ? null : await authenticateDeviceSecret();

    const familyId = authContext?.activeFamilyId ?? childAuth?.familyId ?? deviceAuth?.familyId;
    const memberId = authContext?.activeMemberId ?? childAuth?.memberId ?? undefined;

    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId');

    const schedules = await getTodaysTransportSchedules(familyId, targetMemberId || undefined);

    return NextResponse.json({ schedules });
  } catch (error) {
    logger.error('Error fetching today\'s transport schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}
