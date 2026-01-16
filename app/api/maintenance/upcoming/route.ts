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

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam && !isNaN(parseInt(daysParam)) ? parseInt(daysParam) : 30;

    const upcomingItems = await getUpcomingMaintenanceItems(familyId, days);

    // Map to camelCase for frontend
    const mappedItems = upcomingItems.map(item => ({
      id: item.id,
      familyId: item.family_id,
      name: item.name,
      description: item.description,
      category: item.category,
      frequency: item.frequency,
      season: item.season,
      estimatedCost: item.estimated_cost,
      lastCompletedAt: item.last_completed_at,
      nextDueAt: item.next_due_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ items: mappedItems });
  } catch (error) {
    logger.error('Error fetching upcoming maintenance:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming maintenance' }, { status: 500 });
  }
}
