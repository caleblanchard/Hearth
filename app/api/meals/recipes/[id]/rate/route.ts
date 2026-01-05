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

    // Verify recipe exists and belongs to family
    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { rating, notes } = body;

    // Validate rating
    if (rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Rating is required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Upsert rating (create or update)
    const savedRating = await prisma.recipeRating.upsert({
      where: {
        recipeId_memberId: {
          recipeId: params.id,
          memberId: session.user.id,
        },
      },
      update: {
        rating,
        notes: notes?.trim() || null,
      },
      create: {
        recipeId: params.id,
        memberId: session.user.id,
        rating,
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RECIPE_RATED',
        result: 'SUCCESS',
        metadata: {
          recipeId: params.id,
          rating,
        },
      },
    });

    return NextResponse.json({
      rating: savedRating,
      message: 'Rating saved successfully',
    });
  } catch (error) {
    logger.error('Error saving rating:', error);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
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
    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete rating
    try {
      await prisma.recipeRating.delete({
        where: {
          recipeId_memberId: {
            recipeId: params.id,
            memberId: session.user.id,
          },
        },
      });

      return NextResponse.json({ message: 'Rating removed successfully' });
    } catch (error: any) {
      // Check if rating doesn't exist
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error removing rating:', error);
    return NextResponse.json({ error: 'Failed to remove rating' }, { status: 500 });
  }
}
