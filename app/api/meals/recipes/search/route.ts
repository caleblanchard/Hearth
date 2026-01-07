import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Search recipes with weighted scoring
 * - Title match: 100 points
 * - Tag match: 50 points
 * - Ingredient match: 25 points
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validate query parameter
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const searchTerm = query.toLowerCase().trim();

    // Search recipes by name or ingredients (tags handled in scoring)
    const recipes = await prisma.recipe.findMany({
      where: {
        familyId: session.user.familyId,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          {
            ingredients: {
              some: {
                name: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: true,
        dietaryTags: true,
        ingredients: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate weighted scores for each recipe
    const scoredRecipes = recipes.map((recipe) => {
      let score = 0;

      // Title match: 100 points
      if (recipe.name.toLowerCase().includes(searchTerm)) {
        score += 100;
      }

      // Tag match: 50 points per tag
      const tagsMatch = recipe.dietaryTags.some((tag) =>
        tag.toLowerCase().includes(searchTerm)
      );
      if (tagsMatch) {
        score += 50;
      }

      // Ingredient match: 25 points
      const ingredientsMatch = recipe.ingredients.some((ing) =>
        ing.name.toLowerCase().includes(searchTerm)
      );
      if (ingredientsMatch) {
        score += 25;
      }

      return {
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipe.imageUrl,
        category: recipe.category,
        dietaryTags: recipe.dietaryTags,
        score,
      };
    });

    // Sort by score descending and limit to 5
    const topRecipes = scoredRecipes
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({ recipes: topRecipes });
  } catch (error) {
    logger.error('Error searching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
