import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMaintenanceItem, updateMaintenanceItem, deleteMaintenanceItem } from '@/lib/data/maintenance';
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

    const item = await getMaintenanceItem(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (item.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error('Error fetching maintenance item:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance item' }, { status: 500 });
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

    // Verify item exists
    const existing = await getMaintenanceItem(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 404 });
    }

    const body = await request.json();
    const item = await updateMaintenanceItem(id, body);

    return NextResponse.json({
      success: true,
      item,
      message: 'Maintenance item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating maintenance item:', error);
    return NextResponse.json({ error: 'Failed to update maintenance item' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify item exists
    const existing = await getMaintenanceItem(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 404 });
    }

    await deleteMaintenanceItem(id);

    return NextResponse.json({
      success: true,
      message: 'Maintenance item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting maintenance item:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance item' }, { status: 500 });
  }
}
