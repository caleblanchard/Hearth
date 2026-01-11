import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { fixMealWeekStarts } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

export async function POST() {
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

    // Only parents can run admin fixes
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const result = await fixMealWeekStarts(familyId);

    return NextResponse.json({
      success: true,
      result,
      message: 'Meal week starts fixed successfully',
    });
  } catch (error) {
    logger.error('Fix meal week starts error:', error);
    return NextResponse.json({ error: 'Failed to fix meal week starts' }, { status: 500 });
  }
}
