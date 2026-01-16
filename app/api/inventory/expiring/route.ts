import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getExpiringInventoryItems } from '@/lib/data/inventory';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam && !isNaN(parseInt(daysParam)) ? parseInt(daysParam) : 7;

    const items = await getExpiringInventoryItems(familyId, days);

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
    logger.error('Error fetching expiring items:', error);
    return NextResponse.json({ error: 'Failed to fetch expiring items' }, { status: 500 });
  }
}
