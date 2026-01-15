import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRecipes, createRecipe } from '@/lib/data/recipes';
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') as 'name' | 'rating' | 'created_at' | undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

    // Use data module
    const recipes = await getRecipes(familyId, {
      category,
      searchQuery: search,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
    });

    // Map to camelCase for frontend
    const mappedRecipes = recipes.map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      prepTimeMinutes: recipe.prep_time_minutes,
      cookTimeMinutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      category: recipe.category,
      dietaryTags: recipe.dietary_tags || [],
      isFavorite: recipe.is_favorite,
      imageUrl: recipe.image_url,
      sourceUrl: recipe.source_url,
      instructions: recipe.instructions,
      notes: recipe.notes,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      creator: recipe.created_by ? {
        id: recipe.created_by,
        name: 'Unknown', // We'd need to join to get this
      } : undefined,
      ingredients: [], // Need to join recipe_ingredients if needed
      _count: {
        ratings: recipe.ratingsCount || 0,
      },
      averageRating: recipe.averageRating || 0,
    }));

    return NextResponse.json({ recipes: mappedRecipes, total: mappedRecipes.length });
  } catch (error) {
    logger.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
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

    // Use data module to create recipe
    const recipe = await createRecipe({
      family_id: familyId,
      name: name.trim(),
      description: description?.trim() || null,
      prep_time_minutes: prepTimeMinutes || null,
      cook_time_minutes: cookTimeMinutes || null,
      servings: servings || 4,
      difficulty: difficulty || 'MEDIUM',
      image_url: imageUrl?.trim() || null,
      source_url: sourceUrl?.trim() || null,
      instructions: Array.isArray(instructions)
        ? JSON.stringify(instructions)
        : instructions || JSON.stringify([]),
      notes: notes?.trim() || null,
      is_favorite: false,
      category: category || null,
      dietary_tags: dietaryTags || [],
      created_by: memberId,
    });

    // Create ingredients if provided
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const ingredientRecords = ingredients.map((ing: any, index: number) => ({
        recipe_id: recipe.id,
        name: ing.name || '',
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        notes: ing.notes || null,
        sort_order: index,
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRecords);

      if (ingredientsError) {
        logger.error('Error creating ingredients:', ingredientsError);
        // Don't fail the whole request, just log the error
      }
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RECIPE_CREATED',
      entity_type: 'RECIPE',
      entity_id: recipe.id,
      result: 'SUCCESS',
      metadata: {
        recipeId: recipe.id,
        name: recipe.name,
      },
    });

    return NextResponse.json(
      { recipe, message: 'Recipe created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
