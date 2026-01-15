import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getInventoryItems, createInventoryItem } from '@/lib/data/inventory';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'FOOD_PANTRY',
  'FOOD_FRIDGE',
  'FOOD_FREEZER',
  'CLEANING',
  'TOILETRIES',
  'PAPER_GOODS',
  'MEDICINE',
  'PET_SUPPLIES',
  'OTHER',
];

const VALID_LOCATIONS = [
  'PANTRY',
  'FRIDGE',
  'FREEZER',
  'BATHROOM',
  'GARAGE',
  'LAUNDRY_ROOM',
  'KITCHEN_CABINET',
  'OTHER',
];

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

    // All family members can view inventory
    const items = await getInventoryItems(familyId);

    // Map to camelCase for frontend
    const mappedItems = items.map(item => ({
      id: item.id,
      familyId: item.family_id,
      name: item.name,
      category: item.category,
      location: item.location,
      currentQuantity: item.current_quantity,
      unit: item.unit,
      lowStockThreshold: item.low_stock_threshold,
      expiresAt: item.expires_at,
      barcode: item.barcode,
      notes: item.notes,
      lastRestockedAt: item.last_restocked_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ items: mappedItems });
  } catch (error) {
    logger.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can add inventory items
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can add inventory items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      location,
      currentQuantity,
      unit,
      lowStockThreshold,
      expiresAt,
      barcode,
      notes,
    } = body;

    // Validate required fields
    if (!name || !category || !location || !unit) {
      return NextResponse.json(
        { error: 'Name, category, location, and unit are required' },
        { status: 400 }
      );
    }

    // Validate category enum
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate location enum
    if (!VALID_LOCATIONS.includes(location)) {
      return NextResponse.json(
        {
          error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const item = await createInventoryItem({
      family_id: familyId,
      name,
      category,
      location,
      current_quantity: currentQuantity || 0,
      unit,
      low_stock_threshold: lowStockThreshold || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      barcode: barcode || null,
      notes: notes || null,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'INVENTORY_ITEM_ADDED',
      entity_type: 'INVENTORY_ITEM',
      entity_id: item.id,
      result: 'SUCCESS',
      metadata: { name, category, location },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Inventory item created successfully',
    });
  } catch (error) {
    logger.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
