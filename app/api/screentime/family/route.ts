import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getFamilyScreenTimeOverview } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

export async function GET() {
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

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const overview = await getFamilyScreenTimeOverview(familyId);

    return NextResponse.json({ overview });
  } catch (error) {
    logger.error('Get family screen time overview error:', error);
    return NextResponse.json(
      { error: 'Failed to get overview' },
      { status: 500 }
    );
  }
}
