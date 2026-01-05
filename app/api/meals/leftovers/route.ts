import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const DEFAULT_EXPIRY_DAYS = 3;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active leftovers (not used or tossed)
    const leftovers = await prisma.leftover.findMany({
      where: {
        familyId: session.user.familyId,
        usedAt: null,
        tossedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc', // Soonest to expire first
      },
    });

    return NextResponse.json({ leftovers });
  } catch (error) {
    logger.error('Error fetching leftovers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leftovers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, quantity, daysUntilExpiry, notes, mealPlanEntryId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const now = new Date();
    const expiryDays = daysUntilExpiry || DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create leftover
    const leftover = await prisma.leftover.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        quantity: quantity?.trim() || null,
        storedAt: now,
        expiresAt,
        notes: notes?.trim() || null,
        mealPlanEntryId: mealPlanEntryId || null,
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'LEFTOVER_LOGGED',
        result: 'SUCCESS',
        metadata: {
          leftoverId: leftover.id,
          name: leftover.name,
          expiresAt: leftover.expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json(
      {
        leftover,
        message: 'Leftover logged successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating leftover:', error);
    return NextResponse.json(
      { error: 'Failed to create leftover' },
      { status: 500 }
    );
  }
}
