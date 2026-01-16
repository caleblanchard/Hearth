import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getApprovalStats } from '@/lib/data/approvals';
import { logger } from '@/lib/logger';

/**
 * GET /api/approvals/stats
 * 
 * Returns statistics about pending approvals
 */
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

    // Only parents can view approval stats
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view approval statistics' },
        { status: 403 }
      );
    }

    const stats = await getApprovalStats(familyId);

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Approval stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval statistics' },
      { status: 500 }
    );
  }
}
