import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get items where lowStockThreshold is set (not null)
    // The filtering for currentQuantity <= lowStockThreshold will be done in app logic
    const allItems = await prisma.inventoryItem.findMany({
      where: {
        familyId: session.user.familyId,
        lowStockThreshold: {
          not: null,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filter in-memory for low stock items (quantity <= threshold)
    const lowStockItems = allItems.filter(
      (item) =>
        item.lowStockThreshold !== null &&
        item.currentQuantity <= item.lowStockThreshold
    );

    return NextResponse.json({ items: lowStockItems });
  } catch (error) {
    console.error('Error fetching low-stock items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch low-stock items' },
      { status: 500 }
    );
  }
}
