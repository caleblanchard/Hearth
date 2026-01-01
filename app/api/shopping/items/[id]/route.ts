import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const updates = await request.json();

    // Verify item belongs to user's family
    const item = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.list.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update item
    const updatedItem = await prisma.shoppingItem.update({
      where: { id },
      data: {
        ...updates,
        purchasedAt: updates.status === 'PURCHASED' ? new Date() : item.purchasedAt,
        purchasedById: updates.status === 'PURCHASED' ? session.user.id : item.purchasedById,
      },
    });

    // Log audit if status changed
    if (updates.status && updates.status !== item.status) {
      await prisma.auditLog.create({
        data: {
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'SHOPPING_ITEM_UPDATED',
          entityType: 'ShoppingItem',
          entityId: item.id,
          result: 'SUCCESS',
          metadata: {
            itemName: item.name,
            oldStatus: item.status,
            newStatus: updates.status,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Item updated',
    });
  } catch (error) {
    console.error('Update shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
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

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify item belongs to user's family
    const item = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.list.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete item
    await prisma.shoppingItem.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SHOPPING_ITEM_DELETED',
        entityType: 'ShoppingItem',
        entityId: id,
        result: 'SUCCESS',
        metadata: {
          itemName: item.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Item removed from shopping list',
    });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
