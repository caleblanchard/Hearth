import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

/**
 * GET /api/screentime/types/[id]
 * Get a specific screen time type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = await prisma.screenTimeType.findFirst({
      where: {
        id: params.id,
        familyId: session.user.familyId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
            allowances: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Screen time type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ type });
  } catch (error) {
    logger.error('Error fetching screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time type' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/screentime/types/[id]
 * Update a screen time type (parents only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update types
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update screen time types' },
        { status: 403 }
      );
    }

    const type = await prisma.screenTimeType.findFirst({
      where: {
        id: params.id,
        familyId: session.user.familyId,
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Screen time type not found' },
        { status: 404 }
      );
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, description, isActive } = bodyResult.data;

    const updateData: any = {};
    if (name !== undefined) {
      // Sanitize and validate name
      const sanitizedName = sanitizeString(name);
      if (!sanitizedName || sanitizedName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      // Check for duplicate name (excluding current type)
      const existing = await prisma.screenTimeType.findFirst({
        where: {
          familyId: session.user.familyId,
          name: sanitizedName,
          isArchived: false,
          id: { not: params.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'A screen time type with this name already exists' },
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }
    if (description !== undefined) {
      updateData.description = description ? sanitizeString(description) : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.screenTimeType.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_TYPE_UPDATED',
        result: 'SUCCESS',
        metadata: {
          typeId: updated.id,
          typeName: updated.name,
          changes: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      type: updated,
      message: 'Screen time type updated successfully',
    });
  } catch (error) {
    logger.error('Error updating screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to update screen time type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/screentime/types/[id]
 * Archive a screen time type (parents only)
 * Cannot delete if there are transactions, only archive
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can archive types
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can archive screen time types' },
        { status: 403 }
      );
    }

    const type = await prisma.screenTimeType.findFirst({
      where: {
        id: params.id,
        familyId: session.user.familyId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Screen time type not found' },
        { status: 404 }
      );
    }

    // If there are transactions, archive instead of delete
    if (type._count.transactions > 0) {
      const archived = await prisma.screenTimeType.update({
        where: { id: params.id },
        data: {
          isArchived: true,
          isActive: false,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'SCREENTIME_TYPE_ARCHIVED',
          result: 'SUCCESS',
          metadata: {
            typeId: archived.id,
            typeName: archived.name,
            reason: 'Has transaction history',
          },
        },
      });

      return NextResponse.json({
        type: archived,
        message: 'Screen time type archived successfully (has transaction history)',
      });
    }

    // No transactions, can delete
    await prisma.screenTimeType.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_TYPE_DELETED',
        result: 'SUCCESS',
        metadata: {
          typeId: type.id,
          typeName: type.name,
        },
      },
    });

    return NextResponse.json({
      message: 'Screen time type deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to delete screen time type' },
      { status: 500 }
    );
  }
}
