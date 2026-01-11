import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateShoppingItem } from '@/lib/data/shopping';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const updates = await request.json();

    // Verify item belongs to user's family
    const { data: item } = await supabase
      .from('shopping_items')
      .select('*, list:shopping_lists!inner(family_id)')
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.list.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Add purchase tracking if status changed to PURCHASED
    if (updates.status === 'PURCHASED' && item.status !== 'PURCHASED') {
      updates.purchased_at = new Date().toISOString();
      updates.purchased_by_id = memberId;
    }

    // Update item
    const updatedItem = await updateShoppingItem(id, updates);

    // Log audit if status changed
    if (updates.status && updates.status !== item.status) {
      await supabase.from('audit_logs').insert({
        family_id: familyId,
        member_id: memberId,
        action: 'SHOPPING_ITEM_UPDATED',
        entity_type: 'SHOPPING_ITEM',
        entity_id: id,
        result: 'SUCCESS',
        metadata: { oldStatus: item.status, newStatus: updates.status },
      });
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Item updated successfully',
    });
  } catch (error) {
    logger.error('Update shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify item belongs to user's family
    const { data: item } = await supabase
      .from('shopping_items')
      .select('*, list:shopping_lists!inner(family_id)')
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.list.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete item
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting shopping item:', error);
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    logger.error('Delete shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
