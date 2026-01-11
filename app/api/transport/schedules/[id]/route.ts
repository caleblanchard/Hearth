import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTransportSchedule, updateTransportSchedule, deleteTransportSchedule } from '@/lib/data/transport';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const schedule = await getTransportSchedule(params.id);

    if (!schedule || schedule.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Transport schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    logger.error('Error fetching transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport schedule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify schedule exists
    const existing = await getTransportSchedule(params.id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Transport schedule not found' }, { status: 404 });
    }

    const body = await request.json();
    const schedule = await updateTransportSchedule(params.id, body);

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Transport schedule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update transport schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify schedule exists
    const existing = await getTransportSchedule(params.id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Transport schedule not found' }, { status: 404 });
    }

    await deleteTransportSchedule(params.id);

    return NextResponse.json({
      success: true,
      message: 'Transport schedule deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting transport schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete transport schedule' },
      { status: 500 }
    );
  }
}
