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

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId') || authContext.activeMemberId;
    
    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const instance = await getSickModeStatus(targetMemberId);

    return NextResponse.json({ instance });
  } catch (error) {
    logger.error('Get sick mode status error:', error);
    return NextResponse.json({ error: 'Failed to get sick mode status' }, { status: 500 });
  }
}
