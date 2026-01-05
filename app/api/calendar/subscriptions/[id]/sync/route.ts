/**
 * External Calendar Subscription Sync
 *
 * POST /api/calendar/subscriptions/[id]/sync
 * Manually trigger a sync for an external calendar subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { syncExternalCalendar } from '@/lib/integrations/external-calendar';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get family member info
    // session.user.id is the FamilyMember ID from the auth system
    const familyMember = await prisma.familyMember.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Verify subscription belongs to user's family
    const subscription = await prisma.externalCalendarSubscription.findFirst({
      where: {
        id: params.id,
        familyId: familyMember.familyId,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Trigger sync
    const result = await syncExternalCalendar(params.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Sync failed',
          eventsCreated: result.eventsCreated,
          eventsUpdated: result.eventsUpdated,
          eventsDeleted: result.eventsDeleted,
        },
        { status: 500 }
      );
    }

    logger.info('Manual sync triggered', {
      userId: session.user.id,
      subscriptionId: params.id,
      result,
    });

    return NextResponse.json(
      {
        message: 'Sync completed successfully',
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        eventsDeleted: result.eventsDeleted,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to sync subscription', { error });
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
