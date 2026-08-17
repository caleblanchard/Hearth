import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getPets, createPet } from '@/lib/data/pets';
import { writeAuditLog } from '@/lib/data/lifecycle-core';
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

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const pets = await getPets(familyId);

    return NextResponse.json({ pets });
  } catch (error) {
    logger.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Only parents can add pets
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can add pets' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, species, breed, birthday, imageUrl, notes } = body;

    // Validate required fields
    if (!name || !species) {
      return NextResponse.json(
        { error: 'Name and species are required' },
        { status: 400 }
      );
    }

    // Validate species
    if (!VALID_SPECIES.includes(species)) {
      return NextResponse.json(
        { error: `Invalid species. Must be one of: ${VALID_SPECIES.join(', ')}` },
        { status: 400 }
      );
    }

    const pet = await createPet({
      family_id: familyId,
      name,
      species,
      breed: breed || null,
      birthday: birthday ? new Date(birthday).toISOString() : null,
      image_url: imageUrl || null,
      notes: notes || null,
    });

    // Audit log
    await writeAuditLog({
      familyId,
      memberId,
      action: 'PET_ADDED',
      entityType: 'PET',
      entityId: pet.id,
      result: 'SUCCESS',
      metadata: {
        petId: pet.id,
        name,
        species,
      },
    });

    return NextResponse.json({
      success: true,
      pet,
      message: 'Pet added successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating pet:', error);
    return NextResponse.json({ error: 'Failed to add pet' }, { status: 500 });
  }
}
