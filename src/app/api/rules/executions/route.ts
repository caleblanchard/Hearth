import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getRuleExecutions } from '@/lib/data/automation';
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

    // Check if user is a parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId') || undefined;
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10), 100));
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const successParam = searchParams.get('success');
    const success = successParam === null ? undefined : successParam === 'true';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const { data: executions, count } = await getRuleExecutions(
      familyId, 
      ruleId, 
      limit, 
      offset, 
      success,
      startDate, 
      endDate
    );

    return NextResponse.json({
      executions,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Fetch rule executions error:', error);
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
  }
}
