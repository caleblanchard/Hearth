import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.healthEvent.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            familyId: true,
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
    });

    if (!event || event.member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error('Error fetching health event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health event' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { severity, notes, endedAt } = body;

    // Validate severity if provided
    if (severity !== undefined && severity !== null) {
      if (severity < 1 || severity > 10) {
        return NextResponse.json(
          { error: 'Severity must be between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Get existing event
    const existingEvent = await prisma.healthEvent.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            familyId: true,
          },
        },
      },
    });

    if (!existingEvent || existingEvent.member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    // Children can only update their own events
    if (session.user.role === 'CHILD' && session.user.id !== existingEvent.memberId) {
      return NextResponse.json(
        { error: 'Children can only update their own health events' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (severity !== undefined) updateData.severity = severity;
    if (notes !== undefined) updateData.notes = notes;
    if (endedAt !== undefined) updateData.endedAt = endedAt ? new Date(endedAt) : null;

    // Update health event
    const event = await prisma.healthEvent.update({
      where: { id: params.id },
      data: updateData,
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
    });

    // Determine audit action
    const auditAction = endedAt ? 'HEALTH_EVENT_ENDED' : 'HEALTH_EVENT_UPDATED';

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: auditAction,
        entityType: 'HealthEvent',
        entityId: event.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error('Error updating health event:', error);
    return NextResponse.json(
      { error: 'Failed to update health event' },
      { status: 500 }
    );
  }
}
