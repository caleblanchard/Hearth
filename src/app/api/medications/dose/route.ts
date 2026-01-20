import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { recordMedicationDose } from '@/lib/data/medications';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const { medicationSafetyId, dosage, notes, override, overrideReason } = body;

    if (!medicationSafetyId || !dosage) {
      return NextResponse.json(
        { error: 'Medication Safety ID and dosage are required' },
        { status: 400 }
      );
    }

    const dose = await recordMedicationDose({
      medication_safety_id: medicationSafetyId,
      given_by: memberId,
      dosage,
      notes: notes || null,
      was_override: override || false,
      override_reason: overrideReason || null,
    });

    return NextResponse.json({
      success: true,
      dose,
      message: 'Medication dose recorded successfully',
    });
  } catch (error) {
    logger.error('Record medication dose error:', error);
    return NextResponse.json({ error: 'Failed to record dose' }, { status: 500 });
  }
}
