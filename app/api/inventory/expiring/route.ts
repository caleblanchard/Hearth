import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get days parameter from query string (default: 7)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam && !isNaN(parseInt(daysParam)) ? parseInt(daysParam) : 7;

    // Calculate date threshold (now + days)
    const now = new Date();
    const expirationThreshold = new Date(now);
    expirationThreshold.setDate(expirationThreshold.getDate() + days);

    // Get items expiring within the specified days
    const expiringItems = await prisma.inventoryItem.findMany({
      where: {
        familyId: session.user.familyId,
        expiresAt: {
          not: null,
          lte: expirationThreshold,
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    return NextResponse.json({ items: expiringItems });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring items' },
      { status: 500 }
    );
  }
}
