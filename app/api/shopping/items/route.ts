import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { addShoppingItem, getOrCreateShoppingList } from '@/lib/data/shopping';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

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

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, category, quantity, unit, priority, notes } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const sanitizedCategory = category ? sanitizeString(category) : null;
    const sanitizedUnit = unit ? sanitizeString(unit) : null;
    const sanitizedNotes = notes ? sanitizeString(notes) : null;
    const sanitizedQuantity = quantity ? sanitizeInteger(quantity, 1) : 1;
    
    if (sanitizedQuantity === null) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    const validPriorities = ['NORMAL', 'NEEDED_SOON', 'URGENT'];
    const sanitizedPriority = priority && validPriorities.includes(priority) ? priority : 'NORMAL';

    // Get or create active shopping list
    const shoppingList = await getOrCreateShoppingList(familyId);

    // Create item
    const item = await addShoppingItem({
      list_id: shoppingList.id,
      name: sanitizedName,
      category: sanitizedCategory || null,
      quantity: sanitizedQuantity,
      unit: sanitizedUnit || null,
      priority: sanitizedPriority || 'MEDIUM',
      notes: sanitizedNotes || null,
      requested_by_id: memberId,
      added_by_id: memberId,
      status: 'PENDING',
    });

    // Log audit
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'SHOPPING_ITEM_ADDED',
      entity_type: 'SHOPPING_ITEM',
      entity_id: item.id,
      result: 'SUCCESS',
      metadata: {
        itemName: name,
        category,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Item added to shopping list',
    });
  } catch (error) {
    logger.error('Add shopping item error:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}
