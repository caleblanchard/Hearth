import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/approvals/stats
 * 
 * Returns statistics about pending approvals
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can view approval stats
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can view approval statistics' },
        { status: 403 }
      );
    }

    const familyId = session.user.familyId;

    // Count pending chore completions
    const choreCount = await prisma.choreInstance.count({
      where: {
        status: 'COMPLETED',
        choreSchedule: {
          choreDefinition: {
            familyId,
          },
        },
      },
    });

    // Count pending reward redemptions
    const rewardCount = await prisma.rewardRedemption.count({
      where: {
        status: 'PENDING',
        reward: {
          familyId,
        },
      },
    });

    // Get oldest pending item
    const oldestChore = await prisma.choreInstance.findFirst({
      where: {
        status: 'COMPLETED',
        choreSchedule: {
          choreDefinition: {
            familyId,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
      select: {
        completedAt: true,
      },
    });

    const oldestReward = await prisma.rewardRedemption.findFirst({
      where: {
        status: 'PENDING',
        reward: {
          familyId,
        },
      },
      orderBy: {
        requestedAt: 'asc',
      },
      select: {
        requestedAt: true,
      },
    });

    let oldestPending: Date | undefined;
    if (oldestChore?.completedAt && oldestReward?.requestedAt) {
      oldestPending = oldestChore.completedAt < oldestReward.requestedAt
        ? oldestChore.completedAt
        : oldestReward.requestedAt;
    } else if (oldestChore?.completedAt) {
      oldestPending = oldestChore.completedAt;
    } else if (oldestReward?.requestedAt) {
      oldestPending = oldestReward.requestedAt;
    }

    const total = choreCount + rewardCount;

    // Calculate priority buckets (simplified for now)
    const stats = {
      total,
      byType: {
        choreCompletions: choreCount,
        rewardRedemptions: rewardCount,
        shoppingRequests: 0, // Not implemented yet
        calendarRequests: 0, // Not implemented yet
      },
      byPriority: {
        high: 0,  // Would need to fetch all items and calculate
        normal: total, // Simplified: assume all normal for now
        low: 0,
      },
      oldestPending,
    };

    logger.info('Fetched approval stats', { familyId, total });

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error fetching approval stats', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval statistics' },
      { status: 500 }
    );
  }
}
