/**
 * Calendar Connections Management
 *
 * GET /api/calendar/connections
 * Returns list of calendar connections for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // Get user's calendar connections
    const connections = await prisma.calendarConnection.findMany({
      where: {
        memberId: familyMember.id,
      },
      select: {
        id: true,
        provider: true,
        googleEmail: true,
        googleCalendarId: true,
        syncStatus: true,
        syncEnabled: true,
        importFromGoogle: true,
        exportToGoogle: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude sensitive fields
        accessToken: false,
        refreshToken: false,
        tokenExpiresAt: false,
        syncToken: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Calendar connections retrieved', {
      userId: session.user.id,
      connectionCount: connections.length,
    });

    return NextResponse.json({ connections }, { status: 200 });
  } catch (error) {
    logger.error('Failed to retrieve calendar connections', { error });

    return NextResponse.json(
      { error: 'Failed to retrieve calendar connections' },
      { status: 500 }
    );
  }
}
