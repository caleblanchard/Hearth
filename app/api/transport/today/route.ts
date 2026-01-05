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

    // Get query params
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // Get today's day of week (0 = Sunday, 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Build where clause
    const where: any = {
      familyId: session.user.familyId,
      dayOfWeek,
      isActive: true,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    const schedules = await prisma.transportSchedule.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            relationship: true,
          },
        },
        carpool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { time: 'asc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    logger.error('Error fetching today\'s transport:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s transport' },
      { status: 500 }
    );
  }
}
