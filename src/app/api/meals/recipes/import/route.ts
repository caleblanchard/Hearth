import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { extractRecipeFromUrl } from '@/lib/recipe-extractor';
import { logger } from '@/lib/logger';

/**
 * POST /api/meals/recipes/import
 *
 * Extract recipe data from a URL (two-step import: extract → review → save)
 * This endpoint does NOT save to database - it only returns extracted data
 * User will review/edit and save using POST /api/meals/recipes
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { url } = body;

    // 3. Validate
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      );
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: 'URL must be HTTP or HTTPS' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 4. Extract recipe data from URL
    const recipeData = await extractRecipeFromUrl(url);

    // 5. Return extracted data for review
    return NextResponse.json({
      success: true,
      recipe: recipeData,
      message: 'Recipe extracted successfully. Please review and save.',
    });
  } catch (error: any) {
    logger.error('Recipe import error:', error);
    const message = error.message || 'Failed to import recipe';
    
    if (message === 'No recipe data found at URL' || message.includes('404')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: message,
        details: error.cause || undefined,
      },
      { status: 500 }
    );
  }
}
