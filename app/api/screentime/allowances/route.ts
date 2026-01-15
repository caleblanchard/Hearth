import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMemberAllowances, getFamilyAllowances } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // If memberId provided, get allowances for that member
    if (memberId) {
      const allowances = await getMemberAllowances(memberId);
      return NextResponse.json({ allowances });
    }

    // Otherwise, get allowances for all family members
    if (!authContext.activeFamilyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }
    
    const allowances = await getFamilyAllowances(authContext.activeFamilyId);
    return NextResponse.json({ allowances });
  } catch (error) {
    logger.error('Error fetching allowances:', error);
    return NextResponse.json({ error: 'Failed to fetch allowances' }, { status: 500 });
  }
}
