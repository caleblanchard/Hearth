import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, category, quantity, unit, priority, notes } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const sanitizedCategory = category ? sanitizeString(category) : null;
    const sanitizedUnit = unit ? sanitizeString(unit) : null;
    const sanitizedNotes = notes ? sanitizeString(notes) : null;
    const sanitizedQuantity = quantity ? sanitizeInteger(quantity, 1) : 1;
    
    if (sanitizedQuantity === null) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    const validPriorities = ['NORMAL', 'NEEDED_SOON', 'URGENT'];
    const sanitizedPriority = priority && validPriorities.includes(priority) ? priority : 'NORMAL';

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
        name: sanitizedName,
        category: sanitizedCategory,
        quantity: sanitizedQuantity,
        unit: sanitizedUnit,
        priority: sanitizedPriority,
        status: 'PENDING',
        notes: sanitizedNotes,
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
    logger.error('Add shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}
