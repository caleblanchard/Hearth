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

    // Get vet visits
    const vetVisits = await prisma.petVetVisit.findMany({
      where: {
        petId: params.id,
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    return NextResponse.json({ vetVisits });
  } catch (error) {
    logger.error('Error fetching vet visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vet visits' },
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
    const { visitDate, reason, diagnosis, treatment, cost, nextVisit, notes } = body;

    if (!visitDate || !reason) {
      return NextResponse.json(
        { error: 'Visit date and reason are required' },
        { status: 400 }
      );
    }

    const vetVisit = await prisma.petVetVisit.create({
      data: {
        petId: params.id,
        visitDate: new Date(visitDate),
        reason: reason.trim(),
        diagnosis: diagnosis?.trim() || null,
        treatment: treatment?.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        nextVisit: nextVisit ? new Date(nextVisit) : null,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_VET_VISIT_LOGGED',
        result: 'SUCCESS',
        metadata: {
          petId: pet.id,
          petName: pet.name,
          visitDate: vetVisit.visitDate.toISOString(),
        },
      },
    });

    return NextResponse.json(
      { vetVisit, message: 'Vet visit logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging vet visit:', error);
    return NextResponse.json({ error: 'Failed to log vet visit' }, { status: 500 });
  }
}
