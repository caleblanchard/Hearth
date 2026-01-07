import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/meals/plan/dishes/[id]
 * Update a dish
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

    const dishId = params.id;
    const body = await request.json();
    const { dishName, sortOrder } = body;

    // Verify dish exists and belongs to user's family
    const dish = await prisma.mealPlanDish.findUnique({
      where: { id: dishId },
      include: {
        mealEntry: {
          include: {
            mealPlan: true,
          },
        },
      },
    });

    if (!dish) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    if (dish.mealEntry.mealPlan.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update dish
    const updatedDish = await prisma.mealPlanDish.update({
      where: { id: dishId },
      data: {
        ...(dishName !== undefined && { dishName }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({
      dish: updatedDish,
      message: 'Dish updated successfully',
    });
  } catch (error) {
    logger.error('Error updating dish:', error);
    return NextResponse.json(
      { error: 'Failed to update dish' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meals/plan/dishes/[id]
 * Delete a dish
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

    const dishId = params.id;

    // Verify dish exists and belongs to user's family
    const dish = await prisma.mealPlanDish.findUnique({
      where: { id: dishId },
      include: {
        mealEntry: {
          include: {
            mealPlan: true,
          },
        },
      },
    });

    if (!dish) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    if (dish.mealEntry.mealPlan.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete dish
    await prisma.mealPlanDish.delete({
      where: { id: dishId },
    });

    return NextResponse.json({
      message: 'Dish deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting dish:', error);
    return NextResponse.json(
      { error: 'Failed to delete dish' },
      { status: 500 }
    );
  }
}
