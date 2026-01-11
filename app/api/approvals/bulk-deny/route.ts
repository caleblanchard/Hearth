import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { bulkDenyItems } from '@/lib/data/approvals';
import { logger } from '@/lib/logger';

/**
 * POST /api/approvals/bulk-deny
 * Deny multiple approval items at once
 */
export async function POST(request: NextRequest) {
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

    // Parent-only check
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can deny items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const result = await bulkDenyItems(items);

    return NextResponse.json({
      success: true,
      result,
      message: `${result.successCount} items denied successfully`,
    });
  } catch (error) {
    logger.error('Bulk deny error:', error);
    return NextResponse.json({ error: 'Failed to deny items' }, { status: 500 });
  }
}
