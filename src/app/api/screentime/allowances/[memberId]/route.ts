import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { calculateRemainingTime } from '@/lib/screentime-utils';
import { logger } from '@/lib/logger';

/**
 * GET /api/screentime/allowances/[memberId]
 * Get all allowances for a specific member with remaining time calculations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('id, family_id, name')
      .eq('id', memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 404 }
      );
    }

    const { data: allowances } = await supabase
      .from('screen_time_allowances')
      .select(
        `
        *,
        screen_time_type:screen_time_types(id, name, description, is_active, is_archived)
      `
      )
      .eq('member_id', memberId)
      .eq('screen_time_type.is_active', true)
      .eq('screen_time_type.is_archived', false);

    const normalized = (allowances || []).map((allowance: any) => ({
      ...allowance,
      screenTimeType: allowance.screen_time_type ?? allowance.screenTimeType,
    }));

    const withRemaining = await Promise.all(
      normalized.map(async (allowance: any) => ({
        ...allowance,
        remaining: await calculateRemainingTime(
          memberId,
          allowance.screen_time_type_id ?? allowance.screenTimeTypeId
        ),
      }))
    );

    return NextResponse.json({
      member: { id: member.id, name: member.name },
      allowances: withRemaining,
    });
  } catch (error) {
    logger.error('Get screen time allowances error:', error);
    return NextResponse.json(
      { error: 'Failed to get allowances' },
      { status: 500 }
    );
  }
}
