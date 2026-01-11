import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getLowStockItems } from '@/lib/data/inventory';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    const items = await getLowStockItems(familyId);

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('Error fetching low-stock items:', error);
    return NextResponse.json({ error: 'Failed to fetch low-stock items' }, { status: 500 });
  }
}
