import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { bulkApproveItems } from '@/lib/data/approvals';
import { logger } from '@/lib/logger';

/**
 * POST /api/approvals/bulk-approve
 * Approve multiple approval items at once
 */
export async function POST(request: NextRequest) {
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

    // Parent-only check
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can approve items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const result = await bulkApproveItems(items, memberId);

    return NextResponse.json({
      success: true,
      result,
      message: `${result.successCount} items approved successfully`,
    });
  } catch (error) {
    logger.error('Bulk approve error:', error);
    return NextResponse.json({ error: 'Failed to approve items' }, { status: 500 });
  }
}
