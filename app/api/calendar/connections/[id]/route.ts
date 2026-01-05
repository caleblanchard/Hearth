/**
 * Calendar Connection Management - Individual Connection
 *
 * GET /api/calendar/connections/[id] - Get connection details
 * PATCH /api/calendar/connections/[id] - Update connection settings
 * DELETE /api/calendar/connections/[id] - Delete connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET connection details
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
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Get connection
    const connection = await prisma.calendarConnection.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        memberId: true,
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
        // Exclude sensitive fields
        accessToken: false,
        refreshToken: false,
        tokenExpiresAt: false,
        syncToken: false,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify ownership
    if (connection.memberId !== familyMember.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ connection }, { status: 200 });
  } catch (error) {
    logger.error('Failed to get calendar connection', { error });
    return NextResponse.json({ error: 'Failed to get connection' }, { status: 500 });
  }
}

// PATCH connection settings
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
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Get connection
    const connection = await prisma.calendarConnection.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify ownership
    if (connection.memberId !== familyMember.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Validate allowed fields
    const allowedFields = ['syncEnabled', 'importFromGoogle', 'exportToGoogle'];
    const providedFields = Object.keys(body);
    const hasInvalidFields = providedFields.some((field) => !allowedFields.includes(field));

    if (hasInvalidFields) {
      return NextResponse.json(
        { error: 'Invalid fields. Allowed: syncEnabled, importFromGoogle, exportToGoogle' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.syncEnabled !== undefined) {
      updateData.syncEnabled = body.syncEnabled;

      // Clear sync error when re-enabling
      if (body.syncEnabled === true) {
        updateData.syncError = null;
      }
    }

    if (body.importFromGoogle !== undefined) {
      updateData.importFromGoogle = body.importFromGoogle;
    }

    if (body.exportToGoogle !== undefined) {
      updateData.exportToGoogle = body.exportToGoogle;
    }

    // Update connection
    const updatedConnection = await prisma.calendarConnection.update({
      where: {
        id: params.id,
      },
      data: updateData,
      select: {
        id: true,
        provider: true,
        googleEmail: true,
        syncStatus: true,
        syncEnabled: true,
        importFromGoogle: true,
        exportToGoogle: true,
        lastSyncAt: true,
        syncError: true,
        updatedAt: true,
      },
    });

    logger.info('Calendar connection updated', {
      userId: session.user.id,
      connectionId: params.id,
      updates: updateData,
    });

    return NextResponse.json({ connection: updatedConnection }, { status: 200 });
  } catch (error) {
    logger.error('Failed to update calendar connection', { error });
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}

// DELETE connection
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
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Get connection
    const connection = await prisma.calendarConnection.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify ownership
    if (connection.memberId !== familyMember.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete connection
    await prisma.calendarConnection.delete({
      where: {
        id: params.id,
      },
    });

    logger.info('Calendar connection deleted', {
      userId: session.user.id,
      connectionId: params.id,
      provider: connection.provider,
    });

    return NextResponse.json({ message: 'Connection deleted successfully' }, { status: 200 });
  } catch (error) {
    logger.error('Failed to delete calendar connection', { error });
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
