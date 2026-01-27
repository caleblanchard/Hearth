import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarConnection, updateCalendarConnection, deleteCalendarConnection } from '@/lib/data/calendar';
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

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const connection = await getCalendarConnection(id);

    if (!connection || connection.member_id !== memberId) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error) {
    logger.error('Get calendar connection error:', error);
    return NextResponse.json({ error: 'Failed to get connection' }, { status: 500 });
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

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const existing = await getCalendarConnection(id);
    if (!existing || existing.member_id !== memberId) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate body
    const allowedFields = ['syncEnabled', 'importFromGoogle', 'exportToGoogle', 'name'];
    const invalidFields = Object.keys(body).filter(key => !allowedFields.includes(key));
    
    if (invalidFields.length > 0) {
      return NextResponse.json({ error: `Invalid fields: ${invalidFields.join(', ')}` }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.syncEnabled !== undefined) {
      updates.sync_enabled = body.syncEnabled;
      // Clear error when re-enabling
      if (body.syncEnabled) {
        updates.sync_error = null;
      }
    }
    if (body.importFromGoogle !== undefined) updates.import_from_google = body.importFromGoogle;
    if (body.exportToGoogle !== undefined) updates.export_to_google = body.exportToGoogle;
    if (body.name !== undefined) updates.name = body.name;

    const connection = await updateCalendarConnection(id, updates);

    return NextResponse.json({
      success: true,
      connection,
      message: 'Connection updated successfully',
    });
  } catch (error) {
    logger.error('Update calendar connection error:', error);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
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

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const existing = await getCalendarConnection(id);
    if (!existing || existing.member_id !== memberId) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await deleteCalendarConnection(id);

    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    logger.error('Delete calendar connection error:', error);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
