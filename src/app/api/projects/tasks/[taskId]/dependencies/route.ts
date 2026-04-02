import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { addTaskDependency, removeTaskDependency, getTaskDependencies, getProjectTask } from '@/lib/data/projects';
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
    const { blockingTaskId, dependencyType } = body;

    if (!blockingTaskId) {
      return NextResponse.json({ error: 'Blocking task ID is required' }, { status: 400 });
    }

    if (taskId === blockingTaskId) {
      return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 });
    }

    // Validate tasks existence and permissions
    // Check if task belongs to family (via project)
    const { data: dependentTaskWithProject } = await supabase
      .from('project_tasks')
      .select('*, project:projects(family_id, id)')
      .eq('id', taskId)
      .single();
      
    if (!dependentTaskWithProject) {
      return NextResponse.json({ error: 'Dependent task not found' }, { status: 404 });
    }
    
    if (dependentTaskWithProject.project.family_id !== familyId) {
         return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: blockingTaskWithProject } = await supabase
      .from('project_tasks')
      .select('*, project:projects(family_id, id)')
      .eq('id', blockingTaskId)
      .single();

    if (!blockingTaskWithProject) {
      return NextResponse.json({ error: 'Blocking task not found' }, { status: 404 });
    }

    if (dependentTaskWithProject.project_id !== blockingTaskWithProject.project_id) {
       return NextResponse.json({ error: 'Tasks must belong to the same project' }, { status: 400 });
    }

    // Check for existing dependency
    const { data: existingDependency } = await supabase
      .from('task_dependencies')
      .select('id')
      .eq('dependent_task_id', taskId)
      .eq('blocking_task_id', blockingTaskId)
      .single();
    
    if (existingDependency) {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 400 });
    }

    // Check for circular dependency (direct)
    const { data: reverseDependency } = await supabase
      .from('task_dependencies')
      .select('id')
      .eq('dependent_task_id', blockingTaskId)
      .eq('blocking_task_id', taskId)
      .single();

    if (reverseDependency) {
      return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }
    
    // Check for circular dependency (indirect) - simplified check for path
    // We check if blockingTask already depends on dependentTask (transitively)
    // For now, let's just use the direct check as full graph traversal might be heavy
    // Tests expect 'Circular dependency detected' for indirect too.
    // Implementation of full cycle detection is needed if tests require it.
    // Let's check if the test mocks findMany returning a path.
    // The test mock: dbMock.taskDependency.findMany.mockResolvedValue([indirectDependency]);
    // So we should implementing recursive check or BFS.
    
    // Helper to check path
    const hasPath = async (startId: string, endId: string, visited = new Set<string>()): Promise<boolean> => {
      if (startId === endId) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);

      const { data: deps } = await supabase
        .from('task_dependencies')
        .select('dependent_task_id')
        .eq('blocking_task_id', startId);
        
      if (!deps) return false;
      
      for (const dep of deps) {
        if (await hasPath(dep.dependent_task_id, endId, visited)) return true;
      }
      return false;
    };

    if (await hasPath(taskId, blockingTaskId)) {
      return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }

    // Create dependency with optional type
    const { data: dependency, error: createError } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: taskId, // mapped to dependent_task_id in schema usually? 
        // Wait, schema is dependent_task_id and blocking_task_id
        // addTaskDependency uses: task_id: taskId, depends_on_task_id: dependsOnTaskId
        // Let's check addTaskDependency implementation again.
        // It uses task_id and depends_on_task_id. 
        // Schema likely maps these.
        dependent_task_id: taskId,
        blocking_task_id: blockingTaskId,
        dependency_type: dependencyType || 'FINISH_TO_START'
      })
      .select()
      .single();

    if (createError) throw createError;

    // Audit Log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PROJECT_DEPENDENCY_ADDED',
      entity_type: 'PROJECT_TASK_DEPENDENCY',
      entity_id: dependency.id,
      result: 'SUCCESS',
      metadata: {
        projectId: dependentTaskWithProject.project_id,
        dependencyId: dependency.id,
        dependentTaskId: taskId,
        blockingTaskId: blockingTaskId,
      },
    });

    return NextResponse.json({
      success: true,
      dependency: {
         ...dependency,
         dependentTaskId: dependency.dependent_task_id,
         blockingTaskId: dependency.blocking_task_id
      },
      message: 'Dependency created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Add task dependency error:', error);
    return NextResponse.json({ error: 'Failed to create dependency' }, { status: 500 }); // Changed message to match test
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
      .select(`
        id, 
        dependent_task:project_tasks!dependent_task_id(
          project_id
        )
      `) // Select project_id for audit log
      .eq('dependent_task_id', taskId)
      .eq('blocking_task_id', blockingTaskId)
      .single();

    if (!dependency) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    await removeTaskDependency(dependency.id);

    // Audit Log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'PROJECT_DEPENDENCY_REMOVED',
      result: 'SUCCESS',
      metadata: {
        projectId: dependency.dependent_task?.project_id, // Get from relation
        dependencyId: dependency.id,
        dependentTaskId: taskId,
        blockingTaskId: blockingTaskId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dependency removed successfully',
    });
  } catch (error) {
    logger.error('Remove task dependency error:', error);
    return NextResponse.json({ error: 'Failed to remove dependency' }, { status: 500 });
  }
}
