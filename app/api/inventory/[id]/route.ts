import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onInventoryUpdated } from '@/lib/rules-engine/hooks';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'FOOD_PANTRY',
  'FOOD_FRIDGE',
  'FOOD_FREEZER',
  'CLEANING',
  'TOILETRIES',
  'PAPER_GOODS',
  'MEDICINE',
  'PET_SUPPLIES',
  'OTHER',
];

const VALID_LOCATIONS = [
  'PANTRY',
  'FRIDGE',
  'FREEZER',
  'BATHROOM',
  'GARAGE',
  'LAUNDRY_ROOM',
  'KITCHEN_CABINET',
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

    // Get inventory item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (item.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
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
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (existingItem.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can update inventory items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update inventory items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      location,
      currentQuantity,
      unit,
      lowStockThreshold,
      expiresAt,
      barcode,
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

    // Validate location if provided
    if (location && !VALID_LOCATIONS.includes(location)) {
      return NextResponse.json(
        {
          error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build update data - only update provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location;
    if (currentQuantity !== undefined)
      updateData.currentQuantity = currentQuantity;
    if (unit !== undefined) updateData.unit = unit.trim();
    if (lowStockThreshold !== undefined)
      updateData.lowStockThreshold = lowStockThreshold;
    if (expiresAt !== undefined)
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (barcode !== undefined) updateData.barcode = barcode?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'INVENTORY_ITEM_UPDATED',
        result: 'SUCCESS',
        metadata: {
          itemId: updatedItem.id,
          name: updatedItem.name,
        },
      },
    });

    // Trigger rules engine evaluation (async, fire-and-forget)
    try {
      await onInventoryUpdated(
        {
          id: updatedItem.id,
          name: updatedItem.name,
          category: updatedItem.category,
          currentQuantity: updatedItem.currentQuantity,
          minQuantity: updatedItem.lowStockThreshold,
          maxQuantity: null, // Not used in this implementation
        },
        session.user.familyId
      );
    } catch (error) {
      logger.error('Rules engine hook error:', error);
      // Don't fail the update if rules engine fails
    }

    return NextResponse.json({
      item: updatedItem,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
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
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (existingItem.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can delete inventory items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete inventory items' },
        { status: 403 }
      );
    }

    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'INVENTORY_ITEM_DELETED',
        result: 'SUCCESS',
        metadata: {
          itemId: existingItem.id,
          name: existingItem.name,
        },
      },
    });

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
