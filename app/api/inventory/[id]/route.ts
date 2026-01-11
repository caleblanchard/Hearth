import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateInventoryItem, deleteInventoryItem } from '@/lib/data/inventory';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
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

    return NextResponse.json({ item });
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify item exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await request.json();
    const item = await updateInventoryItem(id, body);

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
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify item exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    await deleteInventoryItem(id);

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
