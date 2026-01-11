import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProjectTask, updateProjectTask, deleteProjectTask } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string } }
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

    const task = await getProjectTask(taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', task.project_id)
      .single();

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    logger.error('Get project task error:', error);
    return NextResponse.json({ error: 'Failed to get task' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string } }
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

    // Verify task exists
    const existing = await getProjectTask(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', existing.project_id)
      .single();

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const task = await updateProjectTask(taskId, body);

    return NextResponse.json({
      success: true,
      task,
      message: 'Task updated successfully',
    });
  } catch (error) {
    logger.error('Update project task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string } }
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

    // Verify task exists
    const existing = await getProjectTask(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', existing.project_id)
      .single();

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await deleteProjectTask(taskId);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.error('Delete project task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
