import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { recordPetFeeding } from '@/lib/data/pets';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify pet exists and belongs to family
    const { data: pet } = await supabase
      .from('pets')
      .select('family_id')
      .eq('id', params.id)
      .single();

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { foodType, amount, notes } = body;

    // Log feeding
    const feeding = await recordPetFeeding(params.id, memberId, {
      foodType: foodType || null,
      amount: amount || null,
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      feeding,
      message: 'Feeding logged successfully',
    });
  } catch (error) {
    logger.error('Log pet feeding error:', error);
    return NextResponse.json({ error: 'Failed to log feeding' }, { status: 500 });
  }
}
