import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { testFetchCalendar } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const result = await testFetchCalendar(url);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Test fetch calendar error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch calendar' }, { status: 500 });
  }
}
