import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateInventoryItem, deleteInventoryItem } from '@/lib/data/inventory';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'FOOD_PANTRY', 'FOOD_FRIDGE', 'FOOD_FREEZER', 'CLEANING',
  'TOILETRIES', 'PAPER_GOODS', 'MEDICINE', 'PET_SUPPLIES', 'OTHER'
];

const VALID_LOCATIONS = [
  'PANTRY', 'FRIDGE', 'FREEZER', 'BATHROOM', 'GARAGE',
  'LAUNDRY_ROOM', 'KITCHEN_CABINET', 'OTHER'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get inventory item
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (item.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Map to camelCase for frontend
    const mappedItem = {
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
    };

    return NextResponse.json({ item: mappedItem });
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const membership = authContext.memberships.find((m: any) => m.family_id === familyId);
    if (!membership || membership.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update inventory items' },
        { status: 403 }
      );
    }

    // Verify item exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('family_id, name')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    // Validate category and location
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.location && !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const item = await updateInventoryItem(id, body);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: authContext.activeMemberId || authContext.user.id,
      action: 'INVENTORY_ITEM_UPDATED',
      result: 'SUCCESS',
      metadata: {
        itemId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const membership = authContext.memberships.find((m: any) => m.family_id === familyId);
    if (!membership || membership.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete inventory items' },
        { status: 403 }
      );
    }

    // Verify item exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('family_id, name')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteInventoryItem(id);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: authContext.activeMemberId || authContext.user.id,
      action: 'INVENTORY_ITEM_DELETED',
      result: 'SUCCESS',
      metadata: {
        itemId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
