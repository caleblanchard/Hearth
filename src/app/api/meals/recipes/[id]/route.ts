import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRecipe, updateRecipe, deleteRecipe } from '@/lib/data/recipes';
import { getMember } from '@/lib/data/members';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const recipe = await getRecipe(id);

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Verify recipe belongs to user's family
    if (recipe.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Map to camelCase for frontend
    const mappedRecipe = {
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
      familyId: recipe.family_id,
      createdBy: recipe.created_by,
      creator: (recipe as any).creator ? {
        id: (recipe as any).creator.id,
        name: (recipe as any).creator.name,
        avatarUrl: (recipe as any).creator.avatar_url,
      } : null,
      ingredients: ((recipe as any).recipe_ingredients || []).map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        sortOrder: ing.sort_order,
      })),
      _count: {
        ratings: recipe.ratingsCount || 0,
      },
      averageRating: recipe.averageRating || 0,
      ratings: ((recipe as any).ratings || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        notes: r.notes,
        createdAt: r.created_at,
        member: r.member ? {
          id: r.member.id,
          name: r.member.name,
          avatarUrl: r.member.avatar_url,
        } : null,
      })),
    };

    return NextResponse.json({ recipe: mappedRecipe });
  } catch (error) {
    logger.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if user is a parent
    const member = await getMember(memberId);

    if (!member || member.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can edit recipes' }, { status: 403 });
    }

    // Verify recipe exists and belongs to family
    const existing = await getRecipe(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate enum values
    if (body.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(body.difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty. Must be one of: EASY, MEDIUM, HARD' },
        { status: 400 }
      );
    }

    if (body.category) {
      const validCategories = ['BREAKFAST', 'LUNCH', 'DINNER', 'DESSERT', 'SNACK', 'SIDE', 'APPETIZER', 'DRINK'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (body.name !== undefined) dbUpdates.name = body.name;
    if (body.description !== undefined) dbUpdates.description = body.description;
    if (body.prepTimeMinutes !== undefined) dbUpdates.prep_time_minutes = body.prepTimeMinutes;
    if (body.cookTimeMinutes !== undefined) dbUpdates.cook_time_minutes = body.cookTimeMinutes;
    if (body.servings !== undefined) dbUpdates.servings = body.servings;
    if (body.difficulty !== undefined) dbUpdates.difficulty = body.difficulty;
    if (body.category !== undefined) dbUpdates.category = body.category;
    if (body.dietaryTags !== undefined) dbUpdates.dietary_tags = body.dietaryTags;
    if (body.isFavorite !== undefined) dbUpdates.is_favorite = body.isFavorite;
    if (body.imageUrl !== undefined) dbUpdates.image_url = body.imageUrl;
    if (body.sourceUrl !== undefined) dbUpdates.source_url = body.sourceUrl;
    if (body.instructions !== undefined) {
      dbUpdates.instructions = Array.isArray(body.instructions)
        ? JSON.stringify(body.instructions)
        : body.instructions;
    }
    if (body.notes !== undefined) dbUpdates.notes = body.notes;

    // Handle ingredients if provided
    if (body.ingredients !== undefined && Array.isArray(body.ingredients)) {
      // First delete existing ingredients
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      
      // Then add new ingredients
      if (body.ingredients.length > 0) {
        const ingredientRecords = body.ingredients.map((ing: any, index: number) => ({
          recipe_id: id,
          name: ing.name || '',
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          notes: ing.notes || null,
          sort_order: ing.sortOrder !== undefined ? ing.sortOrder : index,
        }));

        // Insert new ingredients one by one (since we need to handle sort_order properly)
        for (const record of ingredientRecords) {
          const { error: ingredientError } = await supabase
            .from('recipe_ingredients')
            .insert(record);

          if (ingredientError) {
            logger.error('Error creating ingredient:', ingredientError);
          }
        }
      }
    }
    
    const { data: recipe, error: updateError } = await supabase
      .from('recipes')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        recipe_ingredients(id, name, quantity, unit, notes, sort_order),
        creator:family_members(id, name, avatar_url)
      `)
      .single();

    if (updateError) {
      logger.error('Error updating recipe:', updateError);
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
    }

    if (!recipe) {
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RECIPE_UPDATED',
      entity_type: 'RECIPE',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        recipeId: id,
        name: recipe.name,
      },
    });

    // Map response to camelCase
    const mappedRecipe = {
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
      ingredients: ((recipe as any).recipe_ingredients || []).map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        sortOrder: ing.sort_order,
      })),
    };

    return NextResponse.json({
      success: true,
      recipe: mappedRecipe,
      message: 'Recipe updated successfully',
    });
  } catch (error) {
    logger.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if user is a parent
    const member = await getMember(memberId);

    if (!member || member.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can delete recipes' }, { status: 403 });
    }

    // Verify recipe exists and belongs to family
    const existing = await getRecipe(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    await deleteRecipe(id);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RECIPE_DELETED',
      entity_type: 'RECIPE',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        recipeId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
