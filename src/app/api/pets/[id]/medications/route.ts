import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getPetMedications, addPetMedication } from '@/lib/data/pets';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify pet exists and belongs to family
    const { data: pet } = await supabase
      .from('pets')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const medications = await getPetMedications(id);

    // Map to camelCase for frontend
    const mappedMedications = medications.map(med => ({
      id: med.id,
      petId: med.pet_id,
      medicationName: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
      minIntervalHours: med.min_interval_hours,
      lastGivenAt: med.last_given_at,
      lastGivenBy: med.last_given_by,
      nextDoseAt: med.next_dose_at,
      notes: med.notes,
      isActive: med.is_active,
      createdAt: med.created_at,
      updatedAt: med.updated_at,
    }));

    return NextResponse.json({ medications: mappedMedications });
  } catch (error) {
    logger.error('Get pet medications error:', error);
    return NextResponse.json({ error: 'Failed to get medications' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify pet exists and belongs to family
    const { data: pet } = await supabase
      .from('pets')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!pet || pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const body = await request.json();
    const medication = await addPetMedication(id, memberId, body);

    // Map to camelCase for frontend
    const mappedMedication = {
      id: medication.id,
      petId: medication.pet_id,
      medicationName: medication.medication_name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      minIntervalHours: medication.min_interval_hours,
      lastGivenAt: medication.last_given_at,
      lastGivenBy: medication.last_given_by,
      nextDoseAt: medication.next_dose_at,
      notes: medication.notes,
      isActive: medication.is_active,
      createdAt: medication.created_at,
      updatedAt: medication.updated_at,
    };

    return NextResponse.json({
      success: true,
      medication: mappedMedication,
      message: 'Medication recorded successfully',
    });
  } catch (error) {
    logger.error('Add pet medication error:', error);
    return NextResponse.json({ error: 'Failed to add medication' }, { status: 500 });
  }
}
