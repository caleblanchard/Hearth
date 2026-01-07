import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = session;
  const body = await request.json();
  const { memberId, healthEventId, notes } = body;

  // Validation
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
  }

  // Authorization: children can only start sick mode for themselves
  if (user.role === 'CHILD' && memberId !== user.id) {
    return NextResponse.json(
      { error: 'Children can only start sick mode for themselves' },
      { status: 403 }
    );
  }

  try {
    // Verify member exists and belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.familyId !== user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if sick mode is already active for this member
    const existingInstance = await prisma.sickModeInstance.findFirst({
      where: {
        memberId,
        isActive: true,
      },
    });

    if (existingInstance) {
      return NextResponse.json(
        { error: 'Sick mode is already active for this member' },
        { status: 409 }
      );
    }

    // Verify health event if provided
    if (healthEventId) {
      const healthEvent = await prisma.healthEvent.findUnique({
        where: { id: healthEventId },
      });

      if (!healthEvent || healthEvent.memberId !== memberId) {
        return NextResponse.json({ error: 'Invalid health event' }, { status: 400 });
      }
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

    // Create sick mode instance
    const instance = await prisma.sickModeInstance.create({
      data: {
        familyId: user.familyId,
        memberId,
        triggeredBy: healthEventId ? 'AUTO_FROM_HEALTH_EVENT' : 'MANUAL',
        healthEventId,
        notes,
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: user.familyId,
        memberId: user.id,
        action: 'SICK_MODE_STARTED',
        entityType: 'SickModeInstance',
        entityId: instance.id,
        result: 'SUCCESS',
        metadata: {
          sickMemberId: memberId,
          triggeredBy: instance.triggeredBy,
        },
      },
    });

    return NextResponse.json({ instance, settings }, { status: 201 });
  } catch (error) {
    console.error('Error starting sick mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
