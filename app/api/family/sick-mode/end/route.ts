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
  const { instanceId } = body;

  // Validation
  if (!instanceId) {
    return NextResponse.json({ error: 'Instance ID is required' }, { status: 400 });
  }

  try {
    // Find the sick mode instance
    const existingInstance = await prisma.sickModeInstance.findUnique({
      where: { id: instanceId },
    });

    if (!existingInstance || existingInstance.familyId !== user.familyId) {
      return NextResponse.json({ error: 'Sick mode instance not found' }, { status: 404 });
    }

    // Check if already ended
    if (!existingInstance.isActive) {
      return NextResponse.json({ error: 'Sick mode is already ended' }, { status: 409 });
    }

    // End sick mode
    const instance = await prisma.sickModeInstance.update({
      where: { id: instanceId },
      data: {
        endedAt: new Date(),
        endedById: user.id,
        isActive: false,
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
        action: 'SICK_MODE_ENDED',
        entityType: 'SickModeInstance',
        entityId: instance.id,
        result: 'SUCCESS',
        metadata: {
          sickMemberId: instance.memberId,
        },
      },
    });

    return NextResponse.json({ instance }, { status: 200 });
  } catch (error) {
    console.error('Error ending sick mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
