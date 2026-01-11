import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMemberAllowances } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Use data module
    const allowances = await getMemberAllowances(memberId);

    return NextResponse.json({ allowances });
  } catch (error) {
    logger.error('Error fetching allowances:', error);
    return NextResponse.json({ error: 'Failed to fetch allowances' }, { status: 500 });
  }
}
