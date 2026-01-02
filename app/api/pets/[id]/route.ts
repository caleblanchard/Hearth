import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pet = await prisma.pet.findUnique({
      where: { id: params.id },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Verify family ownership
    if (pet.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ pet });
  } catch (error) {
    console.error('Error fetching pet:', error);
    return NextResponse.json({ error: 'Failed to fetch pet' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pet exists and belongs to family
    const existingPet = await prisma.pet.findUnique({
      where: { id: params.id },
    });

    if (!existingPet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (existingPet.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can update pets
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can update pets' }, { status: 403 });
    }

    const body = await request.json();
    const { name, species, breed, birthday, imageUrl, notes } = body;

    // Validate species if provided
    if (species && !VALID_SPECIES.includes(species)) {
      return NextResponse.json(
        { error: `Invalid species. Must be one of: ${VALID_SPECIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (species !== undefined) updateData.species = species;
    if (breed !== undefined) updateData.breed = breed?.trim() || null;
    if (birthday !== undefined) updateData.birthday = birthday ? new Date(birthday) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Update pet
    const updatedPet = await prisma.pet.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_UPDATED',
        result: 'SUCCESS',
        metadata: {
          petId: updatedPet.id,
          name: updatedPet.name,
        },
      },
    });

    return NextResponse.json({
      pet: updatedPet,
      message: 'Pet updated successfully',
    });
  } catch (error) {
    console.error('Error updating pet:', error);
    return NextResponse.json({ error: 'Failed to update pet' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pet exists and belongs to family
    const existingPet = await prisma.pet.findUnique({
      where: { id: params.id },
    });

    if (!existingPet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (existingPet.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can delete pets
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can delete pets' }, { status: 403 });
    }

    // Delete pet (cascade will handle related records)
    await prisma.pet.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_DELETED',
        result: 'SUCCESS',
        metadata: {
          petId: existingPet.id,
          name: existingPet.name,
        },
      },
    });

    return NextResponse.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
