import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { medicationName, dosage, givenAt, nextDoseHours, notes } = body;

    // Validate required fields
    if (!medicationName || typeof medicationName !== 'string' || !medicationName.trim()) {
      return NextResponse.json(
        { error: 'Medication name is required' },
        { status: 400 }
      );
    }

    if (!dosage || typeof dosage !== 'string' || !dosage.trim()) {
      return NextResponse.json(
        { error: 'Dosage is required' },
        { status: 400 }
      );
    }

    if (!givenAt) {
      return NextResponse.json(
        { error: 'Given at time is required' },
        { status: 400 }
      );
    }

    // Get health event and verify family ownership
    const healthEvent = await prisma.healthEvent.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            familyId: true,
          },
        },
      },
    });

    if (!healthEvent || healthEvent.member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Health event not found' },
        { status: 404 }
      );
    }

    // Only parents can log medications
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can log medications' },
        { status: 403 }
      );
    }

    // Calculate next dose time if hours provided
    let nextDoseAt: Date | null = null;
    if (nextDoseHours && typeof nextDoseHours === 'number' && nextDoseHours > 0) {
      const givenTime = new Date(givenAt);
      nextDoseAt = new Date(givenTime.getTime() + nextDoseHours * 60 * 60 * 1000);
    }

    // Create medication record
    const medication = await prisma.healthMedication.create({
      data: {
        healthEventId: params.id,
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        givenAt: new Date(givenAt),
        givenBy: session.user.id,
        nextDoseAt,
        notes: notes?.trim() || null,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_MEDICATION_GIVEN',
        entityType: 'HealthMedication',
        entityId: medication.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error) {
    logger.error('Error adding medication:', error);
    return NextResponse.json(
      { error: 'Failed to add medication' },
      { status: 500 }
    );
  }
}
