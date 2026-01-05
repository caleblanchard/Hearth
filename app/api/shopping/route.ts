import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = session.user;

    // Get active shopping list for the family
    let shoppingList = await prisma.shoppingList.findFirst({
      where: {
        familyId,
        isActive: true,
      },
      include: {
        items: {
          where: {
            status: {
              in: ['PENDING', 'IN_CART'],
            },
          },
          orderBy: [
            { priority: 'desc' },
            { category: 'asc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    // Create list if it doesn't exist
    if (!shoppingList) {
      shoppingList = await prisma.shoppingList.create({
        data: {
          familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
        include: {
          items: true,
        },
      });
    }

    return NextResponse.json({
      list: {
        id: shoppingList.id,
        name: shoppingList.name,
        itemCount: shoppingList.items.length,
        urgentCount: shoppingList.items.filter(i => i.priority === 'URGENT').length,
      },
      items: shoppingList.items,
    });
  } catch (error) {
    logger.error('Shopping list API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}
