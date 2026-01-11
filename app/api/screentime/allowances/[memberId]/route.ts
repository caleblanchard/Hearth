import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getScreenTimeAllowances } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';

/**
 * GET /api/screentime/allowances/[memberId]
 * Get all allowances for a specific member with remaining time calculations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('id, family_id, name')
      .eq('id', params.memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 404 }
      );
    }

    const allowances = await getScreenTimeAllowances(params.memberId);

    return NextResponse.json({ allowances });
  } catch (error) {
    logger.error('Get screen time allowances error:', error);
    return NextResponse.json(
      { error: 'Failed to get allowances' },
      { status: 500 }
    );
  }
}
