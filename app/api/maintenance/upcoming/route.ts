import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getUpcomingMaintenanceItems } from '@/lib/data/maintenance';
import { logger } from '@/lib/logger';

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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam && !isNaN(parseInt(daysParam)) ? parseInt(daysParam) : 30;

    const upcomingItems = await getUpcomingMaintenanceItems(familyId, days);

    return NextResponse.json({ upcomingItems });
  } catch (error) {
    logger.error('Error fetching upcoming maintenance:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming maintenance' }, { status: 500 });
  }
}
