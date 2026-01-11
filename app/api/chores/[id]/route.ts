import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getChoreDefinition, updateChoreDefinition, deleteChoreDefinition } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const chore = await getChoreDefinition(id);

    if (!chore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    // Verify family ownership
    if (chore.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ chore });
  } catch (error) {
    logger.error('Error fetching chore', error, { choreId: id });
    return NextResponse.json({ error: 'Failed to fetch chore' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify chore exists and belongs to family
    const existingChore = await getChoreDefinition(id);

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (existingChore.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      creditValue,
      difficulty,
      estimatedMinutes,
      minimumAge,
      iconName,
    } = body;

    // Validation
    const updates: any = {};

    if (name !== undefined) {
      const sanitizedName = name?.trim();
      if (!sanitizedName || sanitizedName.length > 100) {
        return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 });
      }
      updates.name = sanitizedName;
    }

    if (description !== undefined) {
      const sanitizedDescription = description?.trim();
      updates.description = sanitizedDescription && sanitizedDescription.length > 0 ? sanitizedDescription : null;
      if (sanitizedDescription && sanitizedDescription.length > 1000) {
        return NextResponse.json({ error: 'Description must be 1000 characters or less' }, { status: 400 });
      }
    }

    if (creditValue !== undefined) {
      if (creditValue < 0) {
        return NextResponse.json({ error: 'Credit value must be 0 or greater' }, { status: 400 });
      }
      updates.credit_value = creditValue;
    }

    if (difficulty !== undefined) {
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        return NextResponse.json({ error: 'Difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
      }
      updates.difficulty = difficulty;
    }

    if (estimatedMinutes !== undefined) {
      if (estimatedMinutes <= 0) {
        return NextResponse.json({ error: 'Estimated minutes must be greater than 0' }, { status: 400 });
      }
      updates.estimated_minutes = estimatedMinutes;
    }

    if (minimumAge !== undefined) {
      updates.minimum_age = minimumAge || null;
    }

    if (iconName !== undefined) {
      updates.icon_name = iconName || null;
    }

    // Update chore
    const updatedChore = await updateChoreDefinition(id, updates);

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      message: 'Chore updated successfully',
    });
  } catch (error) {
    logger.error('Error updating chore', error, { choreId: id });
    return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify chore exists and belongs to family
    const existingChore = await getChoreDefinition(id);

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (existingChore.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete
    await deleteChoreDefinition(id);

    return NextResponse.json({
      success: true,
      message: 'Chore deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting chore', error, { choreId: id });
    return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 });
  }
}
