import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can view pending grace requests
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can view pending grace requests' },
        { status: 403 }
      );
    }

    // Get pending grace requests for family members
    const pendingRequests = await prisma.gracePeriodLog.findMany({
      where: {
        member: {
          familyId: session.user.familyId,
        },
        approvedById: null, // Not yet approved
        repaymentStatus: 'PENDING',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'asc', // Oldest first
      },
    });

    // Get current balance for each member
    const requestsWithBalance = await Promise.all(
      pendingRequests.map(async (request) => {
        const balance = await prisma.screenTimeBalance.findUnique({
          where: { memberId: request.memberId },
        });

        return {
          id: request.id,
          memberId: request.memberId,
          memberName: request.member.name,
          minutesGranted: request.minutesGranted,
          reason: request.reason,
          requestedAt: request.requestedAt.toISOString(),
          currentBalance: balance?.currentBalanceMinutes || 0,
        };
      })
    );

    return NextResponse.json({
      requests: requestsWithBalance,
    });
  } catch (error) {
    logger.error('Error fetching pending grace requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending grace requests' },
      { status: 500 }
    );
  }
}
