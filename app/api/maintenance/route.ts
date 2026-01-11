import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getMaintenanceItems, createMaintenanceItem } from '@/lib/data/maintenance';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'HVAC',
  'PLUMBING',
  'ELECTRICAL',
  'EXTERIOR',
  'INTERIOR',
  'LAWN_GARDEN',
  'APPLIANCES',
  'SAFETY',
  'SEASONAL',
  'OTHER',
];

const VALID_SEASONS = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];

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

    // All family members can view maintenance items
    const items = await getMaintenanceItems(familyId);

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('Error fetching maintenance items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Only parents can add maintenance items
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can add maintenance items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      frequency,
      season,
      nextDueAt,
      estimatedCost,
      notes,
    } = body;

    // Validate required fields
    if (!name || !category || !frequency) {
      return NextResponse.json(
        { error: 'Name, category, and frequency are required' },
        { status: 400 }
      );
    }

    // Validate enums
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (season && !VALID_SEASONS.includes(season)) {
      return NextResponse.json(
        { error: `Invalid season. Must be one of: ${VALID_SEASONS.join(', ')}` },
        { status: 400 }
      );
    }

    const item = await createMaintenanceItem(familyId, {
      name,
      description: description || null,
      category,
      frequency,
      season: season || null,
      nextDueAt: nextDueAt ? new Date(nextDueAt) : new Date(),
      estimatedCost: estimatedCost || null,
      notes: notes || null,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MAINTENANCE_ITEM_CREATED',
      entity_type: 'MAINTENANCE_ITEM',
      entity_id: item.id,
      result: 'SUCCESS',
      metadata: { name, category, frequency },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Maintenance item created successfully',
    });
  } catch (error) {
    logger.error('Error creating maintenance item:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance item' },
      { status: 500 }
    );
  }
}
