import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pet exists and belongs to family
    const pet = await prisma.pet.findUnique({
      where: { id: params.id },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (pet.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get medications
    const medications = await prisma.petMedication.findMany({
      where: {
        petId: params.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ medications });
  } catch (error) {
    logger.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pet exists and belongs to family
    const pet = await prisma.pet.findUnique({
      where: { id: params.id },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (pet.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { medicationName, dosage, frequency, minIntervalHours, notes, isActive } = body;

    if (!medicationName || !dosage || !frequency) {
      return NextResponse.json(
        { error: 'Medication name, dosage, and frequency are required' },
        { status: 400 }
      );
    }

    // Calculate nextDoseAt based on frequency and minIntervalHours
    let nextDoseAt: Date | null = null;
    if (minIntervalHours) {
      nextDoseAt = new Date(Date.now() + minIntervalHours * 60 * 60 * 1000);
    }

    const medication = await prisma.petMedication.create({
      data: {
        petId: params.id,
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        minIntervalHours: minIntervalHours || null,
        notes: notes?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
        nextDoseAt,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_MEDICATION_GIVEN',
        result: 'SUCCESS',
        metadata: {
          petId: pet.id,
          petName: pet.name,
          medicationName: medication.medicationName,
        },
      },
    });

    return NextResponse.json(
      { medication, message: 'Medication added successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error adding medication:', error);
    return NextResponse.json({ error: 'Failed to add medication' }, { status: 500 });
  }
}
