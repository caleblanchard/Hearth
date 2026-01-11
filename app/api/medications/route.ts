import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getMedications, createMedication } from '@/lib/data/medications';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    const medications = await getMedications(familyId, memberId || undefined);

    return NextResponse.json({ medications });
  } catch (error) {
    logger.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create medication safety configs
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create medication safety configurations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memberId: targetMemberId,
      medicationName,
      activeIngredient,
      minIntervalHours,
      maxDosesPerDay,
      notifyWhenReady,
    } = body;

    if (!targetMemberId || !medicationName || !minIntervalHours) {
      return NextResponse.json(
        { error: 'Member ID, medication name, and minimum interval are required' },
        { status: 400 }
      );
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('id, family_id')
      .eq('id', targetMemberId)
      .eq('family_id', familyId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 400 }
      );
    }

    const medication = await createMedication({
      memberId: targetMemberId,
      medicationName,
      activeIngredient,
      minIntervalHours,
      maxDosesPerDay,
      notifyWhenReady: notifyWhenReady ?? false,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEDICATION_CREATED',
      entity_type: 'MEDICATION',
      entity_id: medication.id,
      result: 'SUCCESS',
      metadata: { medicationName, targetMemberId },
    });

    return NextResponse.json({
      success: true,
      medication,
      message: 'Medication safety configuration created successfully',
    });
  } catch (error) {
    logger.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    );
  }
}
