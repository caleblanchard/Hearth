import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getHealthEvent, updateHealthEvent, deleteHealthEvent } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const event = await getHealthEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    // Verify belongs to family (check via member relationship)
    const { data: member } = await createClient()
      .from('family_members')
      .select('family_id')
      .eq('id', event.member_id)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching health event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health event' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify event exists and belongs to family
    const existing = await getHealthEvent(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', existing.member_id)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    const body = await request.json();
    const event = await updateHealthEvent(params.id, body);

    return NextResponse.json({
      success: true,
      event,
      message: 'Health event updated successfully',
    });
  } catch (error) {
    logger.error('Error updating health event:', error);
    return NextResponse.json({ error: 'Failed to update health event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify event exists and belongs to family
    const existing = await getHealthEvent(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', existing.member_id)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    await deleteHealthEvent(params.id);

    return NextResponse.json({
      success: true,
      message: 'Health event deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting health event:', error);
    return NextResponse.json({ error: 'Failed to delete health event' }, { status: 500 });
  }
}
