import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { searchRecipes } from '@/lib/data/recipes';
import { logger } from '@/lib/logger';

/**
 * Search recipes with weighted scoring
 * - Title match: 100 points
 * - Tag match: 50 points
 * - Ingredient match: 25 points
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validate query parameter
    if (!query) {
      return NextResponse.json(
        { error: 'Search query (q) is required' },
        { status: 400 }
      );
    }

    const results = await searchRecipes(familyId, query);

    return NextResponse.json({ results });
  } catch (error) {
    logger.error('Recipe search error:', error);
    return NextResponse.json({ error: 'Failed to search recipes' }, { status: 500 });
  }
}
