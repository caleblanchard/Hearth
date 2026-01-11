import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getPetWeights, addPetWeight } from '@/lib/data/pets';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
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

    const weights = await getPetWeights(params.id);

    return NextResponse.json({ weights });
  } catch (error) {
    logger.error('Get pet weights error:', error);
    return NextResponse.json({ error: 'Failed to get weights' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
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

    if (!pet || pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const body = await request.json();
    const weight = await addPetWeight(params.id, memberId, body);

    return NextResponse.json({
      success: true,
      weight,
      message: 'Weight recorded successfully',
    });
  } catch (error) {
    logger.error('Add pet weight error:', error);
    return NextResponse.json({ error: 'Failed to add weight' }, { status: 500 });
  }
}
