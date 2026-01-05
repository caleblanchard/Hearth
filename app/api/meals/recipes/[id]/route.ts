import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const VALID_CATEGORIES = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'DESSERT',
  'SNACK',
  'SIDE',
  'APPETIZER',
  'DRINK',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        ingredients: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ratings: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Verify family ownership
    if (recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    logger.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify recipe exists and belongs to family
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: params.id },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (existingRecipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      difficulty,
      imageUrl,
      sourceUrl,
      instructions,
      notes,
      isFavorite,
      category,
      dietaryTags,
      ingredients,
    } = body;

    // Validate difficulty enum if provided
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate category enum if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // If ingredients are being updated, handle them in a transaction
    if (ingredients !== undefined) {
      const ingredientsData = ingredients.map((ing: any, index: number) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || null,
        sortOrder: index,
      }));

      const updatedRecipe = await prisma.$transaction(async (tx) => {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: params.id },
        });

        // Update recipe with new ingredients
        const updateData: any = {
          ingredients: {
            create: ingredientsData,
          },
        };

        // Add other fields if provided
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = prepTimeMinutes;
        if (cookTimeMinutes !== undefined) updateData.cookTimeMinutes = cookTimeMinutes;
        if (servings !== undefined) updateData.servings = servings;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
        if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl?.trim() || null;
        if (instructions !== undefined)
          updateData.instructions = JSON.stringify(instructions);
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
        if (category !== undefined) updateData.category = category;
        if (dietaryTags !== undefined) updateData.dietaryTags = dietaryTags;

        return await tx.recipe.update({
          where: { id: params.id },
          data: updateData,
          include: {
            ingredients: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'RECIPE_UPDATED',
          result: 'SUCCESS',
          metadata: {
            recipeId: updatedRecipe.id,
            name: updatedRecipe.name,
          },
        },
      });

      return NextResponse.json({
        recipe: updatedRecipe,
        message: 'Recipe updated successfully',
      });
    }

    // Simple update without ingredients
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = prepTimeMinutes;
    if (cookTimeMinutes !== undefined) updateData.cookTimeMinutes = cookTimeMinutes;
    if (servings !== undefined) updateData.servings = servings;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl?.trim() || null;
    if (instructions !== undefined) updateData.instructions = JSON.stringify(instructions);
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (category !== undefined) updateData.category = category;
    if (dietaryTags !== undefined) updateData.dietaryTags = dietaryTags;

    const updatedRecipe = await prisma.recipe.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ingredients: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RECIPE_UPDATED',
        result: 'SUCCESS',
        metadata: {
          recipeId: updatedRecipe.id,
          name: updatedRecipe.name,
        },
      },
    });

    return NextResponse.json({
      recipe: updatedRecipe,
      message: 'Recipe updated successfully',
    });
  } catch (error) {
    logger.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify recipe exists and belongs to family
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: params.id },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (existingRecipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete recipe (ingredients will cascade delete)
    await prisma.recipe.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RECIPE_DELETED',
        result: 'SUCCESS',
        metadata: {
          recipeId: existingRecipe.id,
          name: existingRecipe.name,
        },
      },
    });

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    logger.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
