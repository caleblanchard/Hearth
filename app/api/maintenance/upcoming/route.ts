import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get days parameter from query string (default: 30)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam && !isNaN(parseInt(daysParam)) ? parseInt(daysParam) : 30;

    // Calculate date threshold (now + days)
    const now = new Date();
    const dueThreshold = new Date(now);
    dueThreshold.setDate(dueThreshold.getDate() + days);

    // Get items due within the specified days (includes overdue items)
    const upcomingItems = await prisma.maintenanceItem.findMany({
      where: {
        familyId: session.user.familyId,
        nextDueAt: {
          not: null,
          lte: dueThreshold,
        },
      },
      orderBy: {
        nextDueAt: 'asc',
      },
    });

    return NextResponse.json({ items: upcomingItems });
  } catch (error) {
    logger.error('Error fetching upcoming maintenance items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming maintenance items' },
      { status: 500 }
    );
  }
}
