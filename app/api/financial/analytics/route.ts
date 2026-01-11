import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getFinancialAnalytics } from '@/lib/data/financial';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view analytics for other members
    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (targetMemberId && targetMemberId !== memberId) {
      const isParent = await isParentInFamily(memberId, familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    const analytics = await getFinancialAnalytics(familyId, targetMemberId || memberId, { startDate, endDate });

    return NextResponse.json({ analytics });
  } catch (error) {
    logger.error('Get financial analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
