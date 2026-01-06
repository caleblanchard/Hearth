import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
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
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pets = await prisma.pet.findMany({
      where: {
        familyId: session.user.familyId,
      },
      include: {
        feedings: {
          orderBy: {
            fedAt: 'desc',
          },
          take: 1,
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format pets with last feeding info
    const petsWithLastFeeding = pets.map(pet => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthday: pet.birthday,
      imageUrl: pet.imageUrl,
      notes: pet.notes,
      lastFedAt: pet.feedings[0]?.fedAt || null,
      lastFedBy: pet.feedings[0]?.member?.name || null,
    }));

    return NextResponse.json({ pets: petsWithLastFeeding });
  } catch (error) {
    logger.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can add pets
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can add pets' }, { status: 403 });
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

    // Create pet
    const pet = await prisma.pet.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        species,
        breed: breed?.trim() || null,
        birthday: birthday ? new Date(birthday) : null,
        imageUrl: imageUrl?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_ADDED',
        result: 'SUCCESS',
        metadata: {
          petId: pet.id,
          name: pet.name,
          species: pet.species,
        },
      },
    });

    return NextResponse.json(
      { pet, message: 'Pet added successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error adding pet:', error);
    return NextResponse.json({ error: 'Failed to add pet' }, { status: 500 });
  }
}
