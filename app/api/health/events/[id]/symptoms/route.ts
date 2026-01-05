import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SymptomType } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

const VALID_SYMPTOM_TYPES: SymptomType[] = [
  'FEVER',
  'COUGH',
  'SORE_THROAT',
  'RUNNY_NOSE',
  'HEADACHE',
  'STOMACH_ACHE',
  'VOMITING',
  'DIARRHEA',
  'RASH',
  'FATIGUE',
  'LOSS_OF_APPETITE',
  'OTHER',
];

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
    const { symptomType, severity, notes } = body;

    // Validate symptom type
    if (!symptomType || !VALID_SYMPTOM_TYPES.includes(symptomType)) {
      return NextResponse.json(
        { error: 'Valid symptom type is required' },
        { status: 400 }
      );
    }

    // Validate severity
    if (!severity || typeof severity !== 'number' || severity < 1 || severity > 10) {
      return NextResponse.json(
        { error: 'Severity must be a number between 1 and 10' },
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

    // Children can only add symptoms to their own events
    if (session.user.role === 'CHILD' && session.user.id !== healthEvent.memberId) {
      return NextResponse.json(
        { error: 'Children can only add symptoms to their own health events' },
        { status: 403 }
      );
    }

    // Create symptom
    const symptom = await prisma.healthSymptom.create({
      data: {
        healthEventId: params.id,
        symptomType,
        severity,
        notes: notes || null,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'HEALTH_SYMPTOM_LOGGED',
        entityType: 'HealthSymptom',
        entityId: symptom.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ symptom }, { status: 201 });
  } catch (error) {
    logger.error('Error adding symptom:', error);
    return NextResponse.json(
      { error: 'Failed to add symptom' },
      { status: 500 }
    );
  }
}
