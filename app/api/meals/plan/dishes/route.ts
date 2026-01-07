import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/meals/plan/dishes
 * Add a dish to an existing meal entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mealEntryId, recipeId, dishName } = body;

    // Validation
    if (!mealEntryId) {
      return NextResponse.json(
        { error: 'Meal entry ID is required' },
        { status: 400 }
      );
    }

    if (!dishName && !recipeId) {
      return NextResponse.json(
        { error: 'Either dishName or recipeId is required' },
        { status: 400 }
      );
    }

    // Verify meal entry exists and belongs to user's family
    const mealEntry = await prisma.mealPlanEntry.findUnique({
      where: { id: mealEntryId },
      include: { mealPlan: true },
    });

    if (!mealEntry) {
      return NextResponse.json(
        { error: 'Meal entry not found' },
        { status: 404 }
      );
    }

    if (mealEntry.mealPlan.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If recipeId provided, verify it exists and get name
    let finalDishName = dishName;
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, familyId: true, name: true },
      });

      if (!recipe) {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }

      if (recipe.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Use recipe name if dishName not provided
      if (!finalDishName) {
        finalDishName = recipe.name;
      }
    }

    // Get next sort order
    const dishCount = await prisma.mealPlanDish.count({
      where: { mealEntryId },
    });

    // Create dish
    const dish = await prisma.mealPlanDish.create({
      data: {
        mealEntryId,
        recipeId: recipeId || null,
        dishName: finalDishName!,
        sortOrder: dishCount,
      },
    });

    return NextResponse.json(
      {
        dish,
        message: 'Dish added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating dish:', error);
    return NextResponse.json(
      { error: 'Failed to create dish' },
      { status: 500 }
    );
  }
}
