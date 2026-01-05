import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const { foodType, amount, notes } = body;

    const now = new Date();

    // Log feeding
    const feeding = await prisma.petFeeding.create({
      data: {
        petId: params.id,
        fedBy: session.user.id,
        fedAt: now,
        foodType: foodType?.trim() || null,
        amount: amount?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PET_FED',
        result: 'SUCCESS',
        metadata: {
          petId: pet.id,
          petName: pet.name,
          fedBy: session.user.id,
        },
      },
    });

    return NextResponse.json(
      { feeding, message: 'Feeding logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging feeding:', error);
    return NextResponse.json({ error: 'Failed to log feeding' }, { status: 500 });
  }
}

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

    // Get feeding history
    const feedings = await prisma.petFeeding.findMany({
      where: {
        petId: params.id,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        fedAt: 'desc',
      },
      take: 50, // Last 50 feedings
    });

    return NextResponse.json({ feedings });
  } catch (error) {
    logger.error('Error fetching feeding history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeding history' },
      { status: 500 }
    );
  }
}
