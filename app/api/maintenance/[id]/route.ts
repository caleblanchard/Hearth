import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get maintenance item with recent completions
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: params.id },
      include: {
        completions: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: 10, // Last 10 completions
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (item.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching maintenance item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance item' },
      { status: 500 }
    );
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

    // Verify item exists and belongs to family
    const existingItem = await prisma.maintenanceItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    if (existingItem.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can update maintenance items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update maintenance items' },
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

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate season if provided
    if (season && !VALID_SEASONS.includes(season)) {
      return NextResponse.json(
        {
          error: `Invalid season. Must be one of: ${VALID_SEASONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build update data - only update provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category;
    if (frequency !== undefined) updateData.frequency = frequency.trim();
    if (season !== undefined) updateData.season = season || null;
    if (nextDueAt !== undefined)
      updateData.nextDueAt = nextDueAt ? new Date(nextDueAt) : null;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const updatedItem = await prisma.maintenanceItem.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MAINTENANCE_ITEM_UPDATED',
        result: 'SUCCESS',
        metadata: {
          itemId: updatedItem.id,
          name: updatedItem.name,
        },
      },
    });

    return NextResponse.json({
      item: updatedItem,
      message: 'Maintenance item updated successfully',
    });
  } catch (error) {
    console.error('Error updating maintenance item:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance item' },
      { status: 500 }
    );
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

    // Verify item exists and belongs to family
    const existingItem = await prisma.maintenanceItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    if (existingItem.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can delete maintenance items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete maintenance items' },
        { status: 403 }
      );
    }

    // Delete the item (cascade will delete completions)
    await prisma.maintenanceItem.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MAINTENANCE_ITEM_DELETED',
        result: 'SUCCESS',
        metadata: {
          itemId: existingItem.id,
          name: existingItem.name,
        },
      },
    });

    return NextResponse.json({
      message: 'Maintenance item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting maintenance item:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance item' },
      { status: 500 }
    );
  }
}
