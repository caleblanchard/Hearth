import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMedicalProfile, updateMedicalProfile } from '@/lib/data/health';
import { logger } from '@/lib/logger';

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
      .select('family_id')
      .eq('id', params.memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const profile = await getMedicalProfile(params.memberId);

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Get medical profile error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

export async function PUT(
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
      .select('family_id')
      .eq('id', params.memberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();
    const profile = await updateMedicalProfile(params.memberId, body);

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
