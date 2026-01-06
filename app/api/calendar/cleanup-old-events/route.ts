/**
 * Cleanup Old External Calendar Events
 * 
 * POST /api/calendar/cleanup-old-events
 * Removes external calendar subscription events older than 12 months
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get family member info
    const familyMember = await prisma.familyMember.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Calculate 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Delete events from external subscriptions that are older than 12 months
    const result = await prisma.calendarEvent.deleteMany({
      where: {
        familyId: familyMember.familyId,
        externalSubscriptionId: { not: null },
        startTime: { lt: twelveMonthsAgo },
      },
    });

    logger.info('Cleaned up old external calendar events', {
      userId: session.user.id,
      deletedCount: result.count,
    });

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedCount: result.count,
    });
  } catch (error) {
    logger.error('Failed to cleanup old events', { error });
    return NextResponse.json(
      { error: 'Failed to cleanup old events' },
      { status: 500 }
    );
  }
}
