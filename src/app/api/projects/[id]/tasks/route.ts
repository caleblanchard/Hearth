import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProjectTasks, createProjectTask } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(
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
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage projects
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    // Check if project exists and belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tasks = await getProjectTasks(id);

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error('Get project tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(
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

    // Check if project exists and belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, status, estimatedHours, actualHours } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
    }

    if (name) {
      body.name = name.trim();
    }

    if (status) {
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

    // Calculate sort order
    const { count } = await supabase
      .from('project_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);
    
    const sortOrder = count || 0;

    const task = await createProjectTask({
      project_id: id,
      name: body.name, // Use trimmed name from body
      description: body.description,
      status: status || 'PENDING',
      assignee_id: body.assigneeId,
      due_date: body.dueDate ? new Date(body.dueDate).toISOString() : undefined,
      estimated_hours: body.estimatedHours,
      actual_hours: body.actualHours,
      sort_order: sortOrder,
    });

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PROJECT_TASK_CREATED',
      entity_type: 'PROJECT_TASK',
      entity_id: task.id,
      result: 'SUCCESS',
      metadata: {
        projectId: id,
        taskId: task.id,
        name: task.name,
      },
    });

    return NextResponse.json({
      success: true,
      task,
      message: 'Task created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Create project task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
