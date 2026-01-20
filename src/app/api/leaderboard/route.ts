import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getLeaderboard } from '@/lib/data/leaderboard';
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
    const periodParam = searchParams.get('period') || 'weekly';
    
    // Map period param to enum
    const periodMap: Record<string, 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'> = {
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'all-time': 'ALL_TIME',
      'alltime': 'ALL_TIME',
    };
    const period = periodMap[periodParam.toLowerCase()] || 'WEEKLY';

    const leaderboard = await getLeaderboard(familyId, period);

    return NextResponse.json({
      leaderboard,
      period,
    });
  } catch (error) {
    logger.error('Fetch leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
