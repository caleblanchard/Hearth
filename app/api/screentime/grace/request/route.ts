import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { requestGracePeriod } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const { allowanceId, minutes, reason } = body;

    if (!allowanceId) {
      return NextResponse.json(
        { error: 'Allowance ID is required' },
        { status: 400 }
      );
    }

    if (minutes === undefined) {
      return NextResponse.json(
        { error: 'Minutes are required' },
        { status: 400 }
      );
    }

    // Request grace period
    const gracePeriod = await requestGracePeriod(allowanceId, memberId, minutes, reason || 'Grace period request');

    return NextResponse.json({
      success: true,
      gracePeriod,
      message: 'Grace period request sent to parents for approval',
    });
  } catch (error) {
    logger.error('Request grace period error:', error);
    return NextResponse.json(
      { error: 'Failed to request grace period' },
      { status: 500 }
    );
  }
}
