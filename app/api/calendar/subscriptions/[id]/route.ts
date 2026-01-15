import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarSubscription, updateCalendarSubscription, deleteCalendarSubscription } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const sub = await getCalendarSubscription(id);

    if (!sub || sub.family_id !== familyId) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

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

    return NextResponse.json({ subscription: mappedSubscription });
  } catch (error) {
    logger.error('Get calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const existing = await getCalendarSubscription(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Map camelCase to snake_case for database
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) updates.url = body.url;
    if (body.description !== undefined) updates.description = body.description;
    if (body.color !== undefined) updates.color = body.color;
    if (body.refreshInterval !== undefined) updates.refresh_interval = body.refreshInterval;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    
    const sub = await updateCalendarSubscription(id, updates);

    // Map response back to camelCase
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
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    logger.error('Update calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const existing = await getCalendarSubscription(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await deleteCalendarSubscription(id);

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully',
    });
  } catch (error) {
    logger.error('Delete calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}
