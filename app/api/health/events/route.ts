import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { HealthEventType } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

const VALID_EVENT_TYPES: HealthEventType[] = [
  'ILLNESS',
  'INJURY',
  'DOCTOR_VISIT',
  'WELLNESS_CHECK',
  'VACCINATION',
  'OTHER',
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const eventType = searchParams.get('eventType');
    const active = searchParams.get('active');

    // Build where clause
    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
    };

    // Filter by memberId if provided
    if (memberId) {
      // Verify member belongs to family
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { familyId: true },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      where.memberId = memberId;
    }

    // Filter by eventType if provided
    if (eventType) {
      where.eventType = eventType;
    }

    // Filter to active events only if requested
    if (active === 'true') {
      where.endedAt = null;
    }

    const events = await prisma.healthEvent.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        symptoms: {
          orderBy: {
            recordedAt: 'desc',
          },
        },
        medications: {
          orderBy: {
            givenAt: 'desc',
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching health events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, eventType, severity, notes } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (!eventType) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Validate severity if provided
    if (severity !== undefined && severity !== null) {
      if (severity < 1 || severity > 10) {
        return NextResponse.json(
          { error: 'Severity must be between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Children can only create events for themselves
    if (session.user.role === 'CHILD' && session.user.id !== memberId) {
      return NextResponse.json(
        { error: 'Children can only create health events for themselves' },
        { status: 403 }
      );
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Create health event
    const event = await prisma.healthEvent.create({
      data: {
        memberId,
        eventType,
        severity,
        notes,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        symptoms: true,
        medications: true,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'HEALTH_EVENT_CREATED',
        entityType: 'HealthEvent',
        entityId: event.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    logger.error('Error creating health event:', error);
    return NextResponse.json(
      { error: 'Failed to create health event' },
      { status: 500 }
    );
  }
}
