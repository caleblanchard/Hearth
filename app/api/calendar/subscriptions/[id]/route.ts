/**
 * External Calendar Subscription Management
 *
 * GET /api/calendar/subscriptions/[id] - Get subscription details
 * PATCH /api/calendar/subscriptions/[id] - Update subscription
 * DELETE /api/calendar/subscriptions/[id] - Delete subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { validateCalendarUrl } from '@/lib/integrations/external-calendar';

export async function GET(
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

    // Get subscription
    const subscription = await prisma.externalCalendarSubscription.findFirst({
      where: {
        id: params.id,
        familyId: familyMember.familyId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        color: true,
        lastSyncAt: true,
        lastSuccessfulSyncAt: true,
        nextSyncAt: true,
        syncStatus: true,
        syncError: true,
        isActive: true,
        refreshInterval: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    logger.error('Failed to retrieve subscription', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve subscription' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const existing = await prisma.externalCalendarSubscription.findFirst({
      where: {
        id: params.id,
        familyId: familyMember.familyId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, url, description, color, isActive, refreshInterval } = body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (url !== undefined) {
      // Validate URL format
      const urlPattern = /^(https?|webcal):\/\/.+/i;
      if (!urlPattern.test(url)) {
        return NextResponse.json(
          { error: 'Invalid URL format. Must be http://, https://, or webcal://' },
          { status: 400 }
        );
      }

      // If URL changed, validate it
      if (url !== existing.url) {
        const validation = await validateCalendarUrl(url);
        if (!validation.valid) {
          return NextResponse.json(
            { error: `Invalid calendar URL: ${validation.error}` },
            { status: 400 }
          );
        }

        // Check for duplicate URL
        const duplicate = await prisma.externalCalendarSubscription.findFirst({
          where: {
            familyId: familyMember.familyId,
            url: url,
            id: { not: params.id },
          },
        });

        if (duplicate) {
          return NextResponse.json(
            { error: 'This calendar URL is already subscribed' },
            { status: 409 }
          );
        }

        updateData.url = url.trim();
        updateData.etag = null; // Reset ETag when URL changes
      }
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (color !== undefined) {
      updateData.color = color;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (refreshInterval !== undefined) {
      if (refreshInterval < 60) {
        return NextResponse.json(
          { error: 'Refresh interval must be at least 60 minutes' },
          { status: 400 }
        );
      }
      updateData.refreshInterval = refreshInterval;
    }

    // Update subscription
    const subscription = await prisma.externalCalendarSubscription.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        color: true,
        lastSyncAt: true,
        lastSuccessfulSyncAt: true,
        nextSyncAt: true,
        syncStatus: true,
        syncError: true,
        isActive: true,
        refreshInterval: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('External calendar subscription updated', {
      userId: session.user.id,
      subscriptionId: subscription.id,
    });

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    logger.error('Failed to update subscription', { error });
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const existing = await prisma.externalCalendarSubscription.findFirst({
      where: {
        id: params.id,
        familyId: familyMember.familyId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Delete all associated calendar events first
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        externalSubscriptionId: params.id,
      },
    });

    logger.info('Deleted calendar events for subscription', {
      subscriptionId: params.id,
      eventsDeleted: deleteResult.count,
    });

    // Delete subscription
    await prisma.externalCalendarSubscription.delete({
      where: { id: params.id },
    });

    logger.info('External calendar subscription deleted', {
      userId: session.user.id,
      subscriptionId: params.id,
    });

    return NextResponse.json({ message: 'Subscription deleted' }, { status: 200 });
  } catch (error) {
    logger.error('Failed to delete subscription', { error });
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
