import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMedicalProfile, updateMedicalProfile } from '@/lib/data/health';
import { logger } from '@/lib/logger';

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
    const requesterId = authContext.activeMemberId;
    const requesterRole = (authContext as any).user?.role;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const profile = await getMedicalProfile(memberId);

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Get medical profile error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

export async function PUT(
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

    const requesterId = authContext.activeMemberId;
    const requesterRole = (authContext as any).user?.role;

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();

    // Only parents can update
    if (requesterRole !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update medical profiles' },
        { status: 403 }
      );
    }

    // Validation
    const { weight, weightUnit, ...rest } = body || {};
    if (weight !== undefined && (typeof weight !== 'number' || weight <= 0)) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      );
    }
    if (
      weightUnit !== undefined &&
      weightUnit !== null &&
      weightUnit !== 'lbs' &&
      weightUnit !== 'kg'
    ) {
      return NextResponse.json(
        { error: 'Weight unit must be either "lbs" or "kg"' },
        { status: 400 }
      );
    }

    const profile = await updateMedicalProfile(memberId, {
      ...rest,
      weight,
      weight_unit: weightUnit,
    });

    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: requesterId,
      action: 'MEDICAL_PROFILE_UPDATED',
      entity_type: 'MedicalProfile',
      entity_id: profile?.id ?? memberId,
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      profile,
      message: 'Medical profile updated successfully',
    });
  } catch (error) {
    logger.error('Update medical profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
