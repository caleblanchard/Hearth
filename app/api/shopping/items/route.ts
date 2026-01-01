import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category, quantity, unit, priority, notes } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const { familyId } = session.user;

    // Get or create active shopping list
    let shoppingList = await prisma.shoppingList.findFirst({
      where: {
        familyId,
        isActive: true,
      },
    });

    if (!shoppingList) {
      shoppingList = await prisma.shoppingList.create({
        data: {
          familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
      });
    }

    // Create item
    const item = await prisma.shoppingItem.create({
      data: {
        listId: shoppingList.id,
        name: name.trim(),
        category: category || null,
        quantity: quantity || 1,
        unit: unit || null,
        priority: priority || 'NORMAL',
        status: 'PENDING',
        notes: notes || null,
        requestedById: session.user.id,
        addedById: session.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        familyId,
        memberId: session.user.id,
        action: 'SHOPPING_ITEM_ADDED',
        entityType: 'ShoppingItem',
        entityId: item.id,
        result: 'SUCCESS',
        metadata: {
          itemName: name,
          category,
          priority,
        },
      },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Item added to shopping list',
    });
  } catch (error) {
    console.error('Add shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}
