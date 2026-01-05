/**
 * External Calendar Subscriptions API
 *
 * GET /api/calendar/subscriptions
 * Returns list of external calendar subscriptions for the authenticated user's family
 *
 * POST /api/calendar/subscriptions
 * Creates a new external calendar subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { validateCalendarUrl } from '@/lib/integrations/external-calendar';

export async function GET(request: NextRequest) {
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
      logger.error('Family member not found for user', { userId: session.user.id });
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Get family's external calendar subscriptions
    const subscriptions = await prisma.externalCalendarSubscription.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('External calendar subscriptions retrieved', {
      userId: session.user.id,
      subscriptionCount: subscriptions.length,
    });

    return NextResponse.json({ subscriptions }, { status: 200 });
  } catch (error) {
    logger.error('Failed to retrieve external calendar subscriptions', { error });

    return NextResponse.json(
      { error: 'Failed to retrieve external calendar subscriptions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      logger.error('Family member not found for user', { userId: session.user.id });
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, url, description, color, refreshInterval } = body;

    // Validate required fields
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    const urlPattern = /^(https?|webcal):\/\/.+/i;
    if (!urlPattern.test(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format. Must be http://, https://, or webcal://' },
        { status: 400 }
      );
    }

    // Validate calendar URL (fetch and parse)
    logger.info('Validating calendar URL', { url });
    const validation = await validateCalendarUrl(url);

    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid calendar URL: ${validation.error}` },
        { status: 400 }
      );
    }

    // Check for duplicate URL in the same family
    const existing = await prisma.externalCalendarSubscription.findFirst({
      where: {
        familyId: familyMember.familyId,
        url: url,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This calendar URL is already subscribed' },
        { status: 409 }
      );
    }

    // Create subscription
    const subscription = await prisma.externalCalendarSubscription.create({
      data: {
        familyId: familyMember.familyId,
        name: name.trim(),
        url: url.trim(),
        description: description?.trim() || null,
        color: color || '#9CA3AF',
        refreshInterval: refreshInterval || 1440, // Default 24 hours
        createdById: familyMember.id,
        nextSyncAt: new Date(), // Schedule immediate sync
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

    logger.info('External calendar subscription created', {
      userId: session.user.id,
      subscriptionId: subscription.id,
      url,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create external calendar subscription', { error });

    return NextResponse.json(
      { error: 'Failed to create external calendar subscription' },
      { status: 500 }
    );
  }
}
