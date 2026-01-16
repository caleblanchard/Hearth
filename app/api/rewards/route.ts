import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getRewardItems, createRewardItem } from '@/lib/data/credits';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Fetch active rewards for the family
    const rewards = await getRewardItems(familyId, true);

    return NextResponse.json({ data: rewards, total: rewards.length });
  } catch (error) {
    logger.error('Rewards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Only parents can create rewards
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden - Parent access required' }, { status: 403 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, description, category, costCredits, quantity, imageUrl } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const sanitizedDescription = description ? sanitizeString(description) : null;
    const sanitizedImageUrl = imageUrl ? sanitizeString(imageUrl) : null;
    
    const sanitizedCostCredits = sanitizeInteger(costCredits, 0);
    if (sanitizedCostCredits === null) {
      return NextResponse.json(
        { error: 'Valid cost in credits is required' },
        { status: 400 }
      );
    }

    const sanitizedQuantity = quantity != null ? sanitizeInteger(quantity, 0) : null;

    // Validate category
    const validCategories = ['PRIVILEGE', 'ITEM', 'EXPERIENCE', 'SCREEN_TIME', 'OTHER'];
    const sanitizedCategory = category && validCategories.includes(category) ? category : 'OTHER';

    // Create reward
    const reward = await createRewardItem(familyId, memberId, {
      name: sanitizedName,
      description: sanitizedDescription,
      category: sanitizedCategory,
      cost_credits: sanitizedCostCredits,
      quantity: sanitizedQuantity,
      image_url: sanitizedImageUrl,
      status: 'ACTIVE',
    });

    return NextResponse.json({
      success: true,
      reward,
      message: 'Reward created successfully',
    });
  } catch (error) {
    logger.error('Create reward error:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}
