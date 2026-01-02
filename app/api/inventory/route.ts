import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // All family members can view inventory
    const items = await prisma.inventoryItem.findMany({
      where: {
        familyId: session.user.familyId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
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

    // Only parents can add inventory items
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can add inventory items' },
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

    // Validate required fields
    if (!name || !category || !location || !unit) {
      return NextResponse.json(
        { error: 'Name, category, location, and unit are required' },
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

    // Validate location enum
    if (!VALID_LOCATIONS.includes(location)) {
      return NextResponse.json(
        {
          error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        category,
        location,
        currentQuantity: currentQuantity !== undefined ? currentQuantity : 0,
        unit: unit.trim(),
        lowStockThreshold:
          lowStockThreshold !== undefined ? lowStockThreshold : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        barcode: barcode?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'INVENTORY_ITEM_ADDED',
        result: 'SUCCESS',
        metadata: {
          itemId: item.id,
          name: item.name,
          category: item.category,
        },
      },
    });

    return NextResponse.json(
      { item, message: 'Inventory item added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory item' },
      { status: 500 }
    );
  }
}
