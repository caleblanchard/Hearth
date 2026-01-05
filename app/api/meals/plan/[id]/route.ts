import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // Get existing entry
    const entry = await prisma.mealPlanEntry.findUnique({
      where: { id: params.id },
      include: {
        mealPlan: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Meal entry not found' }, { status: 404 });
    }

    // Verify entry belongs to user's family
    if (entry.mealPlan.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this meal entry' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { customName, notes, recipeId } = body;

    // Build update data
    const updateData: any = {};

    if (customName !== undefined) updateData.customName = customName?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (recipeId !== undefined) updateData.recipeId = recipeId || null;

    // Update entry
    const updatedEntry = await prisma.mealPlanEntry.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MEAL_ENTRY_UPDATED',
        result: 'SUCCESS',
        metadata: {
          entryId: updatedEntry.id,
          changes: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      entry: updatedEntry,
      message: 'Meal entry updated successfully',
    });
  } catch (error) {
    logger.error('Error updating meal entry:', error);
    return NextResponse.json(
      { error: 'Failed to update meal entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing entry
    const entry = await prisma.mealPlanEntry.findUnique({
      where: { id: params.id },
      include: {
        mealPlan: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Meal entry not found' }, { status: 404 });
    }

    // Verify entry belongs to user's family
    if (entry.mealPlan.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this meal entry' },
        { status: 403 }
      );
    }

    // Delete entry
    await prisma.mealPlanEntry.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MEAL_ENTRY_DELETED',
        result: 'SUCCESS',
        metadata: {
          entryId: entry.id,
          mealType: entry.mealType,
          date: entry.date.toISOString(),
        },
      },
    });

    return NextResponse.json({
      message: 'Meal entry deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting meal entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal entry' },
      { status: 500 }
    );
  }
}
