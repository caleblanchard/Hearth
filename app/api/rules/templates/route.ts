/**
 * API Route: /api/rules/templates
 *
 * GET - Get all rule templates
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllTemplates, getTemplatesByCategory } from '@/lib/rules-engine/templates';
import { logger } from '@/lib/logger';

// ============================================
// GET /api/rules/templates
// Get all rule templates
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates;

    if (category) {
      // Validate category
      const validCategories = ['productivity', 'safety', 'rewards', 'convenience'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category. Must be one of: productivity, safety, rewards, convenience' },
          { status: 400 }
        );
      }

      // Get templates by category
      templates = getTemplatesByCategory(
        category as 'productivity' | 'safety' | 'rewards' | 'convenience'
      );
    } else {
      // Get all templates
      templates = getAllTemplates();
    }

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
