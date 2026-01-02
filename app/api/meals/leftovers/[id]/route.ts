import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing leftover
    const leftover = await prisma.leftover.findUnique({
      where: { id: params.id },
    });

    if (!leftover) {
      return NextResponse.json({ error: 'Leftover not found' }, { status: 404 });
    }

    // Verify leftover belongs to user's family
    if (leftover.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this leftover' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    if (action !== 'used' && action !== 'tossed') {
      return NextResponse.json(
        { error: "Action must be 'used' or 'tossed'" },
        { status: 400 }
      );
    }

    // Update leftover based on action
    const now = new Date();
    const updateData = action === 'used' ? { usedAt: now } : { tossedAt: now };

    const updatedLeftover = await prisma.leftover.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    const auditAction = action === 'used' ? 'LEFTOVER_MARKED_USED' : 'LEFTOVER_MARKED_TOSSED';

    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: auditAction,
        result: 'SUCCESS',
        metadata: {
          leftoverId: updatedLeftover.id,
          name: leftover.name,
          action,
        },
      },
    });

    return NextResponse.json({
      leftover: updatedLeftover,
      message: `Leftover marked as ${action}`,
    });
  } catch (error) {
    console.error('Error updating leftover:', error);
    return NextResponse.json(
      { error: 'Failed to update leftover' },
      { status: 500 }
    );
  }
}
