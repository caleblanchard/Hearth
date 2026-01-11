import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getActiveShoppingList, getOrCreateShoppingList } from '@/lib/data/shopping';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get or create active shopping list
    let shoppingList = await getActiveShoppingList(familyId);

    // Create list if it doesn't exist
    if (!shoppingList) {
      shoppingList = await getOrCreateShoppingList(familyId, 'Family Shopping List');
    }

    return NextResponse.json({
      list: {
        id: shoppingList.id,
        name: shoppingList.name,
        itemCount: shoppingList.items?.length || 0,
        urgentCount: shoppingList.items?.filter((i: any) => i.priority === 'URGENT').length || 0,
      },
      items: shoppingList.items || [],
    });
  } catch (error) {
    logger.error('Shopping list API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}
