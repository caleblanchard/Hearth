/**
 * Debug endpoint to check calendar events
 * GET /api/calendar/debug
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all events for the family
    const allEvents = await prisma.calendarEvent.findMany({
      where: {
        familyId: session.user.familyId,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        externalSubscriptionId: true,
        externalId: true,
        calendarConnectionId: true,
        eventType: true,
        createdAt: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 50, // Limit to first 50
    });

    // Count by type
    const counts = await prisma.calendarEvent.groupBy({
      by: ['eventType', 'externalSubscriptionId'],
      where: {
        familyId: session.user.familyId,
      },
      _count: true,
    });

    // Get external subscriptions
    const subscriptions = await prisma.externalCalendarSubscription.findMany({
      where: {
        familyId: session.user.familyId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        lastSyncAt: true,
        lastSuccessfulSyncAt: true,
        syncStatus: true,
      },
    });

    return NextResponse.json({
      totalEvents: allEvents.length,
      events: allEvents,
      counts,
      subscriptions,
      familyId: session.user.familyId,
    });
  } catch (error) {
    logger.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
