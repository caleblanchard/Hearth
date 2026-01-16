import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarSubscriptions, createCalendarSubscription } from '@/lib/data/calendar';
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

    const subscriptions = await getCalendarSubscriptions(familyId);

    // Map to camelCase for frontend
    const mappedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      familyId: sub.family_id,
      name: sub.name,
      url: sub.url,
      description: sub.description,
      color: sub.color,
      lastSyncAt: sub.last_sync_at,
      lastSuccessfulSyncAt: sub.last_successful_sync_at,
      nextSyncAt: sub.next_sync_at,
      syncStatus: sub.sync_status,
      syncError: sub.sync_error,
      etag: sub.etag,
      isActive: sub.is_active,
      refreshInterval: sub.refresh_interval,
      createdById: sub.created_by_id,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at,
    }));

    return NextResponse.json({ subscriptions: mappedSubscriptions });
  } catch (error) {
    logger.error('Get calendar subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to get subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    
    // Ensure created_by_id is set
    const subscriptionData = {
      ...body,
      created_by_id: memberId,
    };
    
    const sub = await createCalendarSubscription(familyId, subscriptionData);

    // Map to camelCase for frontend
    const mappedSubscription = {
      id: sub.id,
      familyId: sub.family_id,
      name: sub.name,
      url: sub.url,
      description: sub.description,
      color: sub.color,
      lastSyncAt: sub.last_sync_at,
      lastSuccessfulSyncAt: sub.last_successful_sync_at,
      nextSyncAt: sub.next_sync_at,
      syncStatus: sub.sync_status,
      syncError: sub.sync_error,
      etag: sub.etag,
      isActive: sub.is_active,
      refreshInterval: sub.refresh_interval,
      createdById: sub.created_by_id,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at,
    };

    return NextResponse.json({
      success: true,
      subscription: mappedSubscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    logger.error('Create calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
