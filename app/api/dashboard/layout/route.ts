import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getDashboardLayout, updateDashboardLayout } from '@/lib/data/dashboard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/layout
 * Fetch user's dashboard layout configuration
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const layout = await getDashboardLayout(memberId);

    return NextResponse.json({ layout });
  } catch (error) {
    logger.error('Get dashboard layout error:', error);
    return NextResponse.json({ error: 'Failed to get layout' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const layout = await updateDashboardLayout(memberId, body);

    return NextResponse.json({
      success: true,
      layout,
      message: 'Dashboard layout updated successfully',
    });
  } catch (error) {
    logger.error('Update dashboard layout error:', error);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
  }
}
