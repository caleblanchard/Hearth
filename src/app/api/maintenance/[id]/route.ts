import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getMaintenanceItem, updateMaintenanceItem, deleteMaintenanceItem, getMaintenanceCompletions } from '@/lib/data/maintenance';
import { logger } from '@/lib/logger';
import { isParentInFamily } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
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

    // Fetch completions
    const completions = await getMaintenanceCompletions(id);

    // Map to camelCase for frontend
    const mappedItem = {
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
      completions: completions.map((c: any) => ({
        id: c.id,
        maintenanceItemId: c.maintenance_item_id,
        completedBy: c.completed_by,
        completedAt: c.completed_at,
        notes: c.notes,
        cost: c.cost,
        serviceProvider: c.service_provider,
        invoiceUrl: c.invoice_url,
      })),
    };

    return NextResponse.json({ item: mappedItem });
  } catch (error) {
    logger.error('Error fetching maintenance item:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update maintenance items
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can update maintenance items' },
        { status: 403 }
      );
    }

    // Verify item exists
    const existing = await getMaintenanceItem(id);
    if (!existing) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 404 });
    }
    
    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    const validCategories = ['APPLIANCE', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'EXTERIOR', 'INTERIOR', 'LANDSCAPING', 'VEHICLE', 'OTHER'];
    if (body.category && !validCategories.includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const item = await updateMaintenanceItem(id, body);

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: authContext.activeMemberId,
      action: 'MAINTENANCE_ITEM_UPDATED',
      result: 'SUCCESS',
      metadata: {
        itemId: item.id,
        name: item.name,
      }
    });

    // Map to camelCase for frontend
    const mappedItem = {
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
    };

    return NextResponse.json({
      success: true,
      item: mappedItem,
      message: 'Maintenance item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating maintenance item:', error);
    return NextResponse.json({ error: 'Failed to update maintenance item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can delete maintenance items
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can delete maintenance items' },
        { status: 403 }
      );
    }

    // Verify item exists
    const existing = await getMaintenanceItem(id);
    if (!existing) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 404 });
    }
    
    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Maintenance item not found' }, { status: 403 });
    }

    await deleteMaintenanceItem(id);

    // Audit log
    const supabase = await createClient(); // Need to init supabase if not present
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: authContext.activeMemberId,
      action: 'MAINTENANCE_ITEM_DELETED',
      result: 'SUCCESS',
      metadata: {
        itemId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Maintenance item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting maintenance item:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance item' }, { status: 500 });
  }
}
