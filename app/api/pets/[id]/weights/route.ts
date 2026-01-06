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

    // Get weight records
    const weights = await prisma.petWeight.findMany({
      where: {
        petId: params.id,
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    return NextResponse.json({ weights });
  } catch (error) {
    logger.error('Error fetching weights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weights' },
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
    const { weight, unit, recordedAt, notes } = body;

    if (!weight || !unit) {
      return NextResponse.json(
        { error: 'Weight and unit are required' },
        { status: 400 }
      );
    }

    if (!['lbs', 'kg'].includes(unit)) {
      return NextResponse.json(
        { error: 'Unit must be "lbs" or "kg"' },
        { status: 400 }
      );
    }

    const weightRecord = await prisma.petWeight.create({
      data: {
        petId: params.id,
        weight: parseFloat(weight),
        unit: unit,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_WEIGHT_LOGGED',
        result: 'SUCCESS',
        metadata: {
          petId: pet.id,
          petName: pet.name,
          weight: weightRecord.weight,
          unit: weightRecord.unit,
        },
      },
    });

    return NextResponse.json(
      { weight: weightRecord, message: 'Weight logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging weight:', error);
    return NextResponse.json({ error: 'Failed to log weight' }, { status: 500 });
  }
}
