import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { recordPetFeeding } from '@/lib/data/pets';
import { logger } from '@/lib/logger';

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
      .select('family_id, name')
      .eq('id', id)
      .single();

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { amount, notes, foodType } = body;

    // Log feeding
    const feeding = await recordPetFeeding(id, memberId, foodType || undefined, amount || undefined, notes || undefined);

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PET_FED',
      entity_type: 'PET',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        petId: id,
        petName: pet.name || 'Unknown', // Need to select name
        fedBy: memberId,
      },
    });

    return NextResponse.json({
      success: true,
      feeding,
      message: 'Feeding logged successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Log pet feeding error:', error);
    return NextResponse.json({ error: 'Failed to log feeding' }, { status: 500 });
  }
}
