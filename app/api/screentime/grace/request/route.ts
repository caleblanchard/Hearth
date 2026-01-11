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

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const { reason } = await request.json();

    // Request grace period
    const result = await requestGracePeriod(memberId, reason || null);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      gracePeriod: result.gracePeriod,
      requiresApproval: result.requiresApproval,
      message: result.requiresApproval
        ? 'Grace period request sent to parents for approval'
        : 'Grace period granted automatically',
    });
  } catch (error) {
    logger.error('Request grace period error:', error);
    return NextResponse.json(
      { error: 'Failed to request grace period' },
      { status: 500 }
    );
  }
}
