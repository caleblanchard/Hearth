import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getPet, updatePet, deletePet } from '@/lib/data/pets';
import { logger } from '@/lib/logger';

const VALID_SPECIES = [
  'DOG',
  'CAT',
  'BIRD',
  'FISH',
  'HAMSTER',
  'RABBIT',
  'GUINEA_PIG',
  'REPTILE',
  'OTHER',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const pet = await getPet(id);

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Verify family ownership
    if (pet.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ pet });
  } catch (error) {
    logger.error('Error fetching pet:', error);
    return NextResponse.json({ error: 'Failed to fetch pet' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only parents can update pets
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can update pets' },
        { status: 403 }
      );
    }

    // Verify pet exists
    const existing = await getPet(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const body = await request.json();
    const pet = await updatePet(id, body);

    return NextResponse.json({
      success: true,
      pet,
      message: 'Pet updated successfully',
    });
  } catch (error) {
    logger.error('Error updating pet:', error);
    return NextResponse.json({ error: 'Failed to update pet' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can delete pets
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can delete pets' },
        { status: 403 }
      );
    }

    // Verify pet exists
    const existing = await getPet(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    await deletePet(id);

    return NextResponse.json({
      success: true,
      message: 'Pet deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
