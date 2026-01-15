import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { addTaskDependency, removeTaskDependency, getTaskDependencies } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage tasks
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    const dependencies = await getTaskDependencies(taskId);

    return NextResponse.json({ dependencies });
  } catch (error) {
    logger.error('Get task dependencies error:', error);
    return NextResponse.json({ error: 'Failed to get dependencies' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
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

    // Only parents can manage tasks
    const isParent = await isParentInFamily( familyId);
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

    const dependency = await addTaskDependency(taskId, blockingTaskId);

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
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage tasks
    const isParent = await isParentInFamily( familyId);
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

    // Find the dependency record
    const { data: dependency } = await supabase
      .from('task_dependencies')
      .select('id')
      .eq('dependent_task_id', taskId)
      .eq('blocking_task_id', blockingTaskId)
      .single();

    if (!dependency) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    await removeTaskDependency(dependency.id);

    return NextResponse.json({
      success: true,
      message: 'Dependency removed successfully',
    });
  } catch (error) {
    logger.error('Remove task dependency error:', error);
    return NextResponse.json({ error: 'Failed to remove dependency' }, { status: 500 });
  }
}
