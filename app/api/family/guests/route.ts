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

    // Only parents can view guest invites
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can view guest invites' },
        { status: 403 }
      );
    }

    // Get all active guest invites (PENDING and ACTIVE status)
    const invites = await prisma.guestInvite.findMany({
      where: {
        familyId: session.user.familyId,
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        sessions: {
          where: {
            endedAt: null, // Only active sessions
          },
          orderBy: {
            startedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    logger.error('Error fetching guest invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest invites' },
      { status: 500 }
    );
  }
}
