import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getAllTemplates, getTemplatesByCategory } from '@/lib/rules-engine/templates';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Check if user is a parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const validCategories = ['rewards', 'productivity', 'safety', 'convenience'] as const;
    const category = categoryParam && validCategories.includes(categoryParam as any)
      ? (categoryParam as 'rewards' | 'productivity' | 'safety' | 'convenience')
      : undefined;

    const templates = category
      ? getTemplatesByCategory(category)
      : getAllTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('Fetch rule templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
