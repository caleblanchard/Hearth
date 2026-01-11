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

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly'; // weekly, monthly, all-time

    // Calculate period key
    const now = new Date();
    let periodKey: string;
    if (period === 'weekly') {
      const weekNum = Math.ceil((now.getDate() - now.getDay() + 1) / 7);
      periodKey = `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    } else if (period === 'monthly') {
      periodKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    } else {
      periodKey = 'all-time';
    }

    const leaderboard = await getLeaderboard(familyId, periodKey);

    return NextResponse.json({
      leaderboard,
      period,
      periodKey,
    });
  } catch (error) {
    logger.error('Fetch leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
