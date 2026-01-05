import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const memberId = queryMemberId || session.user.id;

    // If viewing another member's history, verify permissions
    if (memberId !== session.user.id) {
      // Only parents can view other members' history
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Cannot view other members history' },
          { status: 403 }
        );
      }

      // Verify member belongs to same family
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: 'Cannot view history from other families' },
          { status: 403 }
        );
      }
    }

    // Get grace logs with pagination
    const [logs, total] = await Promise.all([
      prisma.gracePeriodLog.findMany({
        where: { memberId },
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.gracePeriodLog.count({
        where: { memberId },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching grace history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grace history' },
      { status: 500 }
    );
  }
}
