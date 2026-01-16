import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getFamilyReport } from '@/lib/data/reports';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view family reports
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'week';
    const period = (['month', 'week', 'custom'].includes(periodParam) ? periodParam : 'week') as 'month' | 'week' | 'custom';
    const filters = {
      period,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const report = await getFamilyReport(familyId, filters);

    return NextResponse.json({ report });
  } catch (error) {
    logger.error('Get family report error:', error);
    return NextResponse.json({ error: 'Failed to get family report' }, { status: 500 });
  }
}
