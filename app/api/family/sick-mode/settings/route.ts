import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = session;

  // Verify user's family exists
  if (!user.familyId) {
    return NextResponse.json(
      { error: 'No family associated with user. Please re-login.' },
      { status: 400 }
    );
  }

  try {
    // Verify family exists in database
    const family = await prisma.family.findUnique({
      where: { id: user.familyId },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found. Your session may be stale. Please log out and log back in.' },
        { status: 404 }
      );
    }

    // Get or create settings
    let settings = await prisma.sickModeSettings.findUnique({
      where: { familyId: user.familyId },
    });

    if (!settings) {
      settings = await prisma.sickModeSettings.create({
        data: {
          familyId: user.familyId,
        },
      });
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sick mode settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = session;

  // Verify user's family exists
  if (!user.familyId) {
    return NextResponse.json(
      { error: 'No family associated with user. Please re-login.' },
      { status: 400 }
    );
  }

  // Only parents can update settings
  if (user.role !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can update sick mode settings' },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Validation
  if (body.temperatureThreshold !== undefined) {
    const threshold = Number(body.temperatureThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return NextResponse.json(
        { error: 'Temperature threshold must be a positive number' },
        { status: 400 }
      );
    }
  }

  if (body.screenTimeBonus !== undefined) {
    const bonus = Number(body.screenTimeBonus);
    if (isNaN(bonus) || bonus < 0) {
      return NextResponse.json(
        { error: 'Screen time bonus must be non-negative' },
        { status: 400 }
      );
    }
  }

  try {
    // Verify family exists in database
    const family = await prisma.family.findUnique({
      where: { id: user.familyId },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found. Your session may be stale. Please log out and log back in.' },
        { status: 404 }
      );
    }

    // Get existing settings for audit log
    const existingSettings = await prisma.sickModeSettings.findUnique({
      where: { familyId: user.familyId },
    });

    let settings;
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.sickModeSettings.update({
        where: { familyId: user.familyId },
        data: body,
      });
    } else {
      // Create new settings with provided values
      settings = await prisma.sickModeSettings.create({
        data: {
          familyId: user.familyId,
          ...body,
        },
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: user.familyId,
        memberId: user.id,
        action: 'SICK_MODE_SETTINGS_UPDATED',
        entityType: 'SickModeSettings',
        entityId: settings.id,
        result: 'SUCCESS',
        previousValue: existingSettings ? JSON.parse(JSON.stringify(existingSettings)) : null,
        newValue: JSON.parse(JSON.stringify(settings)),
      },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Error updating sick mode settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
