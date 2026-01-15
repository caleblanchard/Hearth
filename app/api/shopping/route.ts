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

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get or create active shopping list
    let shoppingList = await getActiveShoppingList(familyId);

    // Create list if it doesn't exist
    if (!shoppingList) {
      await getOrCreateShoppingList(familyId);
      // Fetch again to get items relation
      shoppingList = await getActiveShoppingList(familyId);
    }

    if (!shoppingList) {
      return NextResponse.json({ error: 'Failed to create shopping list' }, { status: 500 });
    }

    return NextResponse.json({
      list: {
        id: shoppingList.id,
        name: shoppingList.name,
        itemCount: (shoppingList as any).items?.length || 0,
        urgentCount: (shoppingList as any).items?.filter((i: any) => i.priority === 'URGENT').length || 0,
      },
      items: (shoppingList as any).items || [],
    });
  } catch (error) {
    logger.error('Shopping list API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}
