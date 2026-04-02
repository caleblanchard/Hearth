import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProjectTask, updateProjectTask, deleteProjectTask } from '@/lib/data/projects';
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

    if (!project) {
        console.log('Project not found for task:', task.project_id);
    } else if (project.family_id !== familyId) {
        console.log('Family mismatch:', project.family_id, familyId);
    }

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    logger.error('Get project task error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, status, estimatedHours, actualHours } = body;

    // Validation
    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    
    // Trim name if provided
    if (name) {
      body.name = name.trim();
    }

    if (status !== undefined) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
    }

    if (estimatedHours !== undefined && estimatedHours < 0) {
      return NextResponse.json({ error: 'Estimated hours must be a positive number' }, { status: 400 });
    }

    if (actualHours !== undefined && actualHours < 0) {
      return NextResponse.json({ error: 'Actual hours must be a positive number' }, { status: 400 });
    }

    const task = await updateProjectTask(taskId, body);

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PROJECT_TASK_UPDATED',
      entity_type: 'PROJECT_TASK',
      entity_id: taskId,
      result: 'SUCCESS',
      metadata: {
        projectId: existing.project_id,
        taskId: taskId,
        updates: body,
      },
    });

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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteProjectTask(taskId);

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PROJECT_TASK_DELETED',
      entity_type: 'PROJECT_TASK',
      entity_id: taskId,
      result: 'SUCCESS',
      metadata: {
        projectId: existing.project_id,
        taskId: taskId,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.error('Delete project task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
