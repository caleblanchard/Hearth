import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { resetDashboardLayout } from '@/lib/data/dashboard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/layout/reset
 * Reset user's dashboard layout to default
 */
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

    const layout = await resetDashboardLayout(memberId);

    return NextResponse.json({
      success: true,
      layout,
      message: 'Dashboard layout reset to defaults',
    });
  } catch (error) {
    logger.error('Reset dashboard layout error:', error);
    return NextResponse.json({ error: 'Failed to reset layout' }, { status: 500 });
  }
}
