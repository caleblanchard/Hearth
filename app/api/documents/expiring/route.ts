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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 90;

    // Calculate date threshold
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + days);

    const documents = await prisma.document.findMany({
      where: {
        familyId: session.user.familyId,
        expiresAt: {
          gte: now,
          lte: threshold,
        },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching expiring documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring documents' },
      { status: 500 }
    );
  }
}
