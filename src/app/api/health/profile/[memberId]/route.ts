import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
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

    // Transform snake_case fields to camelCase for UI consistency
    const normalizedProfile = profile ? {
      ...profile,
      bloodType: profile.blood_type,
      weightUnit: profile.weight_unit,
      updatedAt: profile.updated_at,
    } : null;

    return NextResponse.json({ profile: normalizedProfile });
  } catch (error) {
    logger.error('Get medical profile error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  params: Promise<{ memberId: string }>
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
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can update medical profiles' },
        { status: 403 }
      );
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

    const body = await request.json();

    // Validation
    const { weight, weightUnit, bloodType, ...rest } = body || {};
    if (weight !== undefined && weight !== null && (typeof weight !== 'number' || weight <= 0)) {
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
      blood_type: bloodType,
    });

    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: requesterId,
      action: 'MEDICAL_PROFILE_UPDATED',
      entity_type: 'MedicalProfile',
      entity_id: profile?.id ?? memberId,
      result: 'SUCCESS',
    });

    // Normalize response to camelCase
    const normalizedProfile = profile ? {
      ...profile,
      bloodType: profile.blood_type,
      weightUnit: profile.weight_unit,
      updatedAt: profile.updated_at,
    } : null;

    return NextResponse.json({
      success: true,
      profile: normalizedProfile,
      message: 'Medical profile updated successfully',
    });
  } catch (error) {
    logger.error('Update medical profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
