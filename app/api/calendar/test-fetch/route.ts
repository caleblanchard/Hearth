/**
 * Test endpoint to fetch and inspect calendar data
 * GET /api/calendar/test-fetch?url=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchCalendarData, parseICalData } from '@/lib/integrations/external-calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    // Fetch calendar data
    const { data, etag, lastModified } = await fetchCalendarData(url);

    if (!data) {
      return NextResponse.json({
        error: 'No data returned (304 Not Modified?)',
        etag,
        lastModified,
      });
    }

    // Parse events
    const parsedEvents = parseICalData(data);

    // Analyze dates
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);
    const fiveYearsFuture = new Date(now);
    fiveYearsFuture.setFullYear(now.getFullYear() + 5);

    const eventDates = parsedEvents.map(e => e.startTime).sort((a, b) => a.getTime() - b.getTime());
    const eventsInRange = parsedEvents.filter(e => e.startTime >= twelveMonthsAgo && e.startTime <= fiveYearsFuture);
    const futureEvents = parsedEvents.filter(e => e.startTime > now);
    const oldEvents = parsedEvents.filter(e => e.startTime < twelveMonthsAgo);

    return NextResponse.json({
      url,
      dataLength: data.length,
      totalEvents: parsedEvents.length,
      eventsInRange: eventsInRange.length,
      futureEvents: futureEvents.length,
      oldEvents: oldEvents.length,
      dateRange: {
        earliest: eventDates[0]?.toISOString(),
        latest: eventDates[eventDates.length - 1]?.toISOString(),
        filterStart: twelveMonthsAgo.toISOString(),
        filterEnd: fiveYearsFuture.toISOString(),
        now: now.toISOString(),
      },
      sampleEvents: parsedEvents.slice(0, 10).map(e => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        isAllDay: e.isAllDay,
        inRange: e.startTime >= twelveMonthsAgo && e.startTime <= fiveYearsFuture,
      })),
      etag,
      lastModified,
    });
  } catch (error) {
    logger.error('Test fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calendar',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
