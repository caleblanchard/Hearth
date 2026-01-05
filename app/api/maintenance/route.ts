import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'HVAC',
  'PLUMBING',
  'ELECTRICAL',
  'EXTERIOR',
  'INTERIOR',
  'LAWN_GARDEN',
  'APPLIANCES',
  'SAFETY',
  'SEASONAL',
  'OTHER',
];

const VALID_SEASONS = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // All family members can view maintenance items
    const items = await prisma.maintenanceItem.findMany({
      where: {
        familyId: session.user.familyId,
      },
      orderBy: {
        nextDueAt: 'asc',
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('Error fetching maintenance items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can add maintenance items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can add maintenance items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      frequency,
      season,
      nextDueAt,
      estimatedCost,
      notes,
    } = body;

    // Validate required fields
    if (!name || !category || !frequency) {
      return NextResponse.json(
        { error: 'Name, category, and frequency are required' },
        { status: 400 }
      );
    }

    // Validate category enum
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate season enum if provided
    if (season && !VALID_SEASONS.includes(season)) {
      return NextResponse.json(
        {
          error: `Invalid season. Must be one of: ${VALID_SEASONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create maintenance item
    const item = await prisma.maintenanceItem.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        description: description?.trim() || null,
        category,
        frequency: frequency.trim(),
        season: season || null,
        nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
        estimatedCost: estimatedCost !== undefined ? estimatedCost : null,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MAINTENANCE_ITEM_CREATED',
        result: 'SUCCESS',
        metadata: {
          itemId: item.id,
          name: item.name,
          category: item.category,
        },
      },
    });

    return NextResponse.json(
      { item, message: 'Maintenance item created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating maintenance item:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance item' },
      { status: 500 }
    );
  }
}
