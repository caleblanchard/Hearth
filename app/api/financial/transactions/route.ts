import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getFinancialTransactions } from '@/lib/data/financial';
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

    const { searchParams } = new URL(request.url);
    const filters = {
      memberId: searchParams.get('memberId') || undefined,
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
      limit: Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100),
    };

    const transactions = await getFinancialTransactions(familyId, memberId, filters);

    return NextResponse.json({ transactions });
  } catch (error) {
    logger.error('Get financial transactions error:', error);
    return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 });
  }
}
