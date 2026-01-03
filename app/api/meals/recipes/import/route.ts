import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractRecipeFromUrl } from '@/lib/recipe-extractor';

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 3. Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must be HTTP or HTTPS' }, { status: 400 });
    }

    // 4. Extract recipe data
    try {
      const recipe = await extractRecipeFromUrl(url);

      // 5. Return extracted data (not saved yet - two-step process)
      return NextResponse.json({ recipe }, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'No recipe data found') {
        return NextResponse.json({ error: 'No recipe data found at URL' }, { status: 404 });
      }

      console.error('Recipe extraction error:', errorMessage);
      return NextResponse.json({ error: 'Failed to extract recipe' }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in import route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
