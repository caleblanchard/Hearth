import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getMemberAllowances, getFamilyAllowances } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/request-validation';
import { sanitizeString } from '@/lib/input-sanitization';

const normalizeAllowance = (allowance: any) => ({
  id: allowance.id,
  memberId: allowance.member_id ?? allowance.memberId,
  screenTimeTypeId: allowance.screen_time_type_id ?? allowance.screenTimeTypeId,
  allowanceMinutes: allowance.allowance_minutes ?? allowance.allowanceMinutes,
  period: allowance.period,
  rolloverEnabled: allowance.rollover_enabled ?? allowance.rolloverEnabled ?? false,
  rolloverCapMinutes: allowance.rollover_cap_minutes ?? allowance.rolloverCapMinutes ?? null,
  createdAt: allowance.created_at ?? allowance.createdAt,
  updatedAt: allowance.updated_at ?? allowance.updatedAt,
  member: allowance.member,
  screenTimeType: allowance.screenTimeType ?? allowance.screen_type,
});

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const screenTimeTypeId = searchParams.get('screenTimeTypeId');

    // If memberId provided, get allowances for that member
    if (memberId) {
      const allowances = await getMemberAllowances(memberId);
      const filtered = screenTimeTypeId
        ? allowances.filter(
            (allowance: any) =>
              allowance.screen_time_type_id === screenTimeTypeId ||
              allowance.screenTimeTypeId === screenTimeTypeId
          )
        : allowances;
      return NextResponse.json({ allowances: filtered.map(normalizeAllowance) });
    }

    // Otherwise, get allowances for all family members
    if (!authContext.activeFamilyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }
    
    const allowances = await getFamilyAllowances(authContext.activeFamilyId);
    const filtered = screenTimeTypeId
      ? allowances.filter(
          (allowance: any) =>
            allowance.screen_time_type_id === screenTimeTypeId ||
            allowance.screenTimeTypeId === screenTimeTypeId
        )
      : allowances;
    return NextResponse.json({ allowances: filtered.map(normalizeAllowance) });
  } catch (error) {
    logger.error('Error fetching allowances:', error);
    return NextResponse.json({ error: 'Failed to fetch allowances' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage screen time allowances' },
        { status: 403 }
      );
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }

    const {
      memberId: rawMemberId,
      screenTimeTypeId: rawScreenTimeTypeId,
      allowanceMinutes,
      period,
      rolloverEnabled = false,
      rolloverCapMinutes,
    } = bodyResult.data;

    if (!rawMemberId || !rawScreenTimeTypeId || allowanceMinutes === undefined || !period) {
      return NextResponse.json(
        { error: 'Member ID, screen time type ID, allowance minutes, and period are required' },
        { status: 400 }
      );
    }

    if (allowanceMinutes < 0) {
      return NextResponse.json(
        { error: 'Allowance minutes must be non-negative' },
        { status: 400 }
      );
    }

    if (rolloverEnabled && rolloverCapMinutes !== undefined && rolloverCapMinutes !== null) {
      if (rolloverCapMinutes < 0) {
        return NextResponse.json(
          { error: 'Rollover cap must be non-negative' },
          { status: 400 }
        );
      }
    }

    if (period !== 'DAILY' && period !== 'WEEKLY') {
      return NextResponse.json(
        { error: 'Invalid period - must be DAILY or WEEKLY' },
        { status: 400 }
      );
    }

    const memberIdValue = sanitizeString(rawMemberId);
    const screenTimeTypeIdValue = sanitizeString(rawScreenTimeTypeId);
    if (!memberIdValue || !screenTimeTypeIdValue) {
      return NextResponse.json(
        { error: 'Member ID and screen time type ID are required' },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id, family_id, name')
      .eq('id', memberIdValue)
      .single();

    if (memberError || !member || member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 400 }
      );
    }

    const { data: screenTimeType, error: typeError } = await supabase
      .from('screen_time_types')
      .select('id, family_id, is_archived')
      .eq('id', screenTimeTypeIdValue)
      .single();

    if (typeError || !screenTimeType || screenTimeType.family_id !== familyId || screenTimeType.is_archived) {
      return NextResponse.json(
        { error: 'Screen time type not found or is archived' },
        { status: 400 }
      );
    }

    const { data: allowance, error: allowanceError } = await supabase
      .from('screen_time_allowances')
      .upsert(
        {
          member_id: memberIdValue,
          screen_time_type_id: screenTimeTypeIdValue,
          allowance_minutes: allowanceMinutes,
          period,
          rollover_enabled: rolloverEnabled,
          rollover_cap_minutes: rolloverEnabled ? rolloverCapMinutes ?? null : null,
        },
        { onConflict: 'member_id,screen_time_type_id' }
      )
      .select(
        `
        *,
        member:family_members!screen_time_allowances_member_id_fkey(id, name),
        screenTimeType:screen_time_types!screen_time_allowances_screen_time_type_id_fkey(id, name)
      `
      )
      .single();

    if (allowanceError || !allowance) {
      logger.error('Error saving allowance:', allowanceError);
      return NextResponse.json({ error: 'Failed to save allowance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      allowance: normalizeAllowance(allowance),
      message: 'Allowance saved successfully',
    });
  } catch (error) {
    logger.error('Error saving allowance:', error);
    return NextResponse.json({ error: 'Failed to save allowance' }, { status: 500 });
  }
}
