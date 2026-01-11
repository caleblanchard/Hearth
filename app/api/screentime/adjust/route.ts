import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { adjustScreenTimeAllowance } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const parentMemberId = authContext.defaultMemberId;

    if (!familyId || !parentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can adjust allowances
    const isParent = await isParentInFamily(parentMemberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, screenTimeTypeId: rawScreenTimeTypeId, amountMinutes, reason } = body;

    if (!memberId || !rawScreenTimeTypeId || amountMinutes === undefined || amountMinutes === 0) {
      return NextResponse.json(
        { error: 'Member ID, screen time type ID, and non-zero amount required' },
        { status: 400 }
      );
    }

    const screenTimeTypeId = sanitizeString(rawScreenTimeTypeId);

    // Verify member belongs to same family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id, name')
      .eq('id', memberId)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Adjust allowance
    const result = await adjustScreenTimeAllowance(memberId, screenTimeTypeId, amountMinutes, reason || 'Manual adjustment');

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: parentMemberId,
      action: amountMinutes > 0 ? 'SCREENTIME_ALLOWANCE_INCREASED' : 'SCREENTIME_ALLOWANCE_DECREASED',
      entity_type: 'SCREENTIME_ALLOWANCE',
      entity_id: result.allowance.id,
      result: 'SUCCESS',
      metadata: {
        targetMember: targetMember.name,
        adjustment: amountMinutes,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      allowance: result.allowance,
      message: `Adjusted ${targetMember.name}'s screen time by ${amountMinutes} minutes`,
    });
  } catch (error) {
    logger.error('Adjust allowance error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust allowance' },
      { status: 500 }
    );
  }
}
