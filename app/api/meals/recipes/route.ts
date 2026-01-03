import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isFavorite = searchParams.get('isFavorite');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      familyId: session.user.familyId,
    };

    if (category) {
      where.category = category;
    }

    if (isFavorite !== null) {
      where.isFavorite = isFavorite === 'true';
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const recipes = await prisma.recipe.findMany({
      where,
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
        _count: {
          select: {
            ratings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate difficulty enum
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate category enum
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare ingredients with sortOrder
    const ingredientsData =
      ingredients?.map((ing: any, index: number) => ({
        name: ing.name,
        ...(ing.quantity !== undefined && { quantity: ing.quantity }),
        ...(ing.unit !== undefined && ing.unit?.trim() && { unit: ing.unit.trim() }),
        ...(ing.notes !== undefined && ing.notes?.trim() && { notes: ing.notes.trim() }),
        sortOrder: ing.sortOrder ?? index,
      })) || [];

    // Create recipe
    const recipe = await prisma.recipe.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        description: description?.trim() || null,
        prepTimeMinutes: prepTimeMinutes || null,
        cookTimeMinutes: cookTimeMinutes || null,
        servings: servings || 4,
        difficulty: difficulty || 'MEDIUM',
        imageUrl: imageUrl?.trim() || null,
        sourceUrl: sourceUrl?.trim() || null,
        instructions: instructions || JSON.stringify([]),
        notes: notes?.trim() || null,
        isFavorite: isFavorite || false,
        category: category || null,
        dietaryTags: dietaryTags || [],
        createdBy: session.user.id,
        ingredients: {
          create: ingredientsData,
        },
      },
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
        action: 'RECIPE_CREATED',
        result: 'SUCCESS',
        metadata: {
          recipeId: recipe.id,
          name: recipe.name,
        },
      },
    });

    return NextResponse.json(
      { recipe, message: 'Recipe created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
