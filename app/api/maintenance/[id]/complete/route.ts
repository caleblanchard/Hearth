import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify maintenance item exists and belongs to family
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    if (item.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { cost, serviceProvider, notes, photoUrls } = body;

    const now = new Date();

    // Log completion - all family members can log completions
    const completion = await prisma.maintenanceCompletion.create({
      data: {
        maintenanceItemId: params.id,
        completedBy: session.user.id,
        completedAt: now,
        cost: cost !== undefined ? cost : null,
        serviceProvider: serviceProvider?.trim() || null,
        notes: notes?.trim() || null,
        photoUrls: photoUrls || [],
      },
    });

    // Update item's lastCompletedAt
    await prisma.maintenanceItem.update({
      where: { id: params.id },
      data: {
        lastCompletedAt: now,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MAINTENANCE_TASK_COMPLETED',
        result: 'SUCCESS',
        metadata: {
          itemId: item.id,
          itemName: item.name,
          completedBy: session.user.id,
        },
      },
    });

    return NextResponse.json(
      { completion, message: 'Maintenance task completed successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging maintenance completion:', error);
    return NextResponse.json(
      { error: 'Failed to log maintenance completion' },
      { status: 500 }
    );
  }
}
