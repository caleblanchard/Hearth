import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProject, updateProject, deleteProject } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

const normalizeTask = (task: any) => ({
  ...task,
  dueDate: task.due_date ?? task.dueDate ?? null,
  startDate: task.start_date ?? task.startDate ?? null,
  estimatedHours: task.estimated_hours ?? task.estimatedHours ?? null,
  actualHours: task.actual_hours ?? task.actualHours ?? null,
  createdAt: task.created_at ?? task.createdAt,
  sortOrder: task.sort_order ?? task.sortOrder ?? null,
});

const normalizeProject = (project: any) => ({
  ...project,
  dueDate: project.due_date ?? project.dueDate ?? null,
  startDate: project.start_date ?? project.startDate ?? null,
  createdAt: project.created_at ?? project.createdAt,
  familyId: project.family_id ?? project.familyId,
  tasks: project.tasks ? project.tasks.map(normalizeTask) : undefined,
});

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

    const project = await getProject(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check family access
    if (project.family_id !== familyId) {
      // Return 404 to avoid leaking existence
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project: normalizeProject(project) });
  } catch (error) {
    logger.error('Error fetching project', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(
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

    // Verify project exists
    const existing = await getProject(id);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check family access
    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Map camelCase to snake_case and validate
    const updates: any = {};
    
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    
    if (body.description !== undefined) updates.description = body.description;
    
    if (body.status !== undefined) {
      const validStatuses = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED', 'PLANNED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }
    
    if (body.budget !== undefined) {
      if (typeof body.budget !== 'number' || body.budget < 0) {
        return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 });
      }
      updates.budget = body.budget;
    }

    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.dueDate !== undefined) updates.due_date = body.dueDate;
    if (body.notes !== undefined) updates.notes = body.notes;
    
    // Date validation
    const startDate = updates.start_date || existing.start_date;
    const dueDate = updates.due_date || existing.due_date;

    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);
      if (due < start) {
        return NextResponse.json({ error: 'Due date must be after start date' }, { status: 400 });
      }
    }
 
    const project = await updateProject(id, updates);
    
    // Create audit log
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      actor_id: memberId,
      action: 'PROJECT_UPDATED',
      entity_type: 'PROJECT',
      entity_id: id,
      details: {
        projectId: id,
        updates: updates,
      },
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      project: normalizeProject(project),
      message: 'Project updated successfully',
    });
  } catch (error) {
    logger.error('Error updating project', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
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

    // Verify project exists
    const existing = await getProject(id);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await deleteProject(id);
    
    // Create audit log
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      actor_id: memberId,
      action: 'PROJECT_DELETED',
      entity_type: 'PROJECT',
      entity_id: id,
      details: {
        projectId: id,
        name: existing.name,
      },
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting project', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
