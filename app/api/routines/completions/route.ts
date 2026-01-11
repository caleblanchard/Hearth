import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRoutineCompletions } from '@/lib/data/routines';
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
    const filters = {
      memberId: searchParams.get('memberId') || undefined,
      routineId: searchParams.get('routineId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100),
      offset: Math.max(0, parseInt(searchParams.get('offset') || '0', 10)),
    };

    const completions = await getRoutineCompletions(familyId, filters);

    return NextResponse.json({ completions });
  } catch (error) {
    logger.error('Fetch routine completions error:', error);
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
  }
}
