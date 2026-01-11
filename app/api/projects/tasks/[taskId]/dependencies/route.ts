import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { addTaskDependency, removeTaskDependency, getTaskDependencies } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage tasks
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    const dependencies = await getTaskDependencies(params.taskId);

    return NextResponse.json({ dependencies });
  } catch (error) {
    logger.error('Get task dependencies error:', error);
    return NextResponse.json({ error: 'Failed to get dependencies' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
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

    // Only parents can manage tasks
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { blockingTaskId } = body;

    if (!blockingTaskId) {
      return NextResponse.json({ error: 'blockingTaskId is required' }, { status: 400 });
    }

    const dependency = await addTaskDependency(params.taskId, blockingTaskId);

    return NextResponse.json({
      success: true,
      dependency,
      message: 'Dependency added successfully',
    });
  } catch (error) {
    logger.error('Add task dependency error:', error);
    return NextResponse.json({ error: 'Failed to add dependency' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
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

    // Only parents can manage tasks
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { blockingTaskId } = body;

    if (!blockingTaskId) {
      return NextResponse.json({ error: 'blockingTaskId is required' }, { status: 400 });
    }

    await removeTaskDependency(params.taskId, blockingTaskId);

    return NextResponse.json({
      success: true,
      message: 'Dependency removed successfully',
    });
  } catch (error) {
    logger.error('Remove task dependency error:', error);
    return NextResponse.json({ error: 'Failed to remove dependency' }, { status: 500 });
  }
}
