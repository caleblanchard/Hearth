import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Default preferences
const DEFAULT_PREFERENCES = {
  enabledTypes: [],
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  pushEnabled: true,
  inAppEnabled: true,
  leftoverExpiringHours: 24,
  documentExpiringDays: 90,
  carpoolReminderMinutes: 30,
};

// Validate time format (HH:MM)
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    // Return preferences or defaults if none exist
    return NextResponse.json({
      preferences: preferences || DEFAULT_PREFERENCES,
    });
  } catch (error) {
    logger.error('Fetch notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate quiet hours format if provided
    if (updates.quietHoursStart && !isValidTimeFormat(updates.quietHoursStart)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours format. Use HH:MM format (e.g., "22:00")' },
        { status: 400 }
      );
    }

    if (updates.quietHoursEnd && !isValidTimeFormat(updates.quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours format. Use HH:MM format (e.g., "07:00")' },
        { status: 400 }
      );
    }

    // Validate numeric values
    const numericFields = [
      'leftoverExpiringHours',
      'documentExpiringDays',
      'carpoolReminderMinutes',
    ];

    for (const field of numericFields) {
      if (updates[field] !== undefined && updates[field] < 0) {
        return NextResponse.json(
          { error: `${field} must be positive` },
          { status: 400 }
        );
      }
    }

    // Upsert preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: updates,
      create: {
        userId: session.user.id,
        ...updates,
      },
    });

    logger.info('Notification preferences updated', {
      userId: session.user.id,
      updates: Object.keys(updates),
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
