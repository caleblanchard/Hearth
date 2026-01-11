import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { rateRecipe } from '@/lib/data/recipes';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify recipe exists and belongs to family
    const { data: recipe } = await supabase
      .from('recipes')
      .select('family_id')
      .eq('id', params.id)
      .single();

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.family_id !== familyId) {
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

    const result = await rateRecipe(params.id, memberId, rating, notes || null);

    return NextResponse.json({
      success: true,
      rating: result.rating,
      recipe: result.recipe,
      message: 'Recipe rated successfully',
    });
  } catch (error) {
    logger.error('Rate recipe error:', error);
    return NextResponse.json({ error: 'Failed to rate recipe' }, { status: 500 });
  }
}
