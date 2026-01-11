import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getPets, createPet } from '@/lib/data/pets';
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

    const familyId = authContext.defaultFamilyId;
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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can add pets
    const isParent = await isParentInFamily(memberId, familyId);
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

    const pet = await createPet(familyId, {
      name,
      species,
      breed: breed || null,
      birthday: birthday ? new Date(birthday) : null,
      imageUrl: imageUrl || null,
      notes: notes || null,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PET_CREATED',
      entity_type: 'PET',
      entity_id: pet.id,
      result: 'SUCCESS',
      metadata: { name, species },
    });

    return NextResponse.json({
      success: true,
      pet,
      message: 'Pet created successfully',
    });
  } catch (error) {
    logger.error('Error creating pet:', error);
    return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 });
  }
}
