import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper function to detect circular dependencies
async function hasCircularDependency(
  dependentTaskId: string,
  blockingTaskId: string
): Promise<boolean> {
  // Direct circular: blocking task depends on dependent task
  const directCircular = await prisma.taskDependency.findFirst({
    where: {
      dependentTaskId: blockingTaskId,
      blockingTaskId: dependentTaskId,
    },
  });

  if (directCircular) {
    return true;
  }

  // Indirect circular: check if blockingTask transitively depends on dependentTask
  const visited = new Set<string>();
  const queue: string[] = [blockingTaskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;

    if (visited.has(currentTaskId)) {
      continue;
    }

    visited.add(currentTaskId);

    // Find all tasks that the current task blocks (i.e., tasks that depend on current task)
    const dependencies = await prisma.taskDependency.findMany({
      where: {
        blockingTaskId: currentTaskId,
      },
      select: {
        dependentTaskId: true,
      },
    });

    for (const dep of dependencies) {
      if (dep.dependentTaskId === dependentTaskId) {
        // Found a path back to the dependent task - circular dependency
        return true;
      }
      queue.push(dep.dependentTaskId);
    }
  }

  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage tasks
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { blockingTaskId, dependencyType } = body;

    // Validate blockingTaskId
    if (!blockingTaskId) {
      return NextResponse.json(
        { error: 'Blocking task ID is required' },
        { status: 400 }
      );
    }

    // Check if task tries to depend on itself
    if (params.taskId === blockingTaskId) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Check if dependent task exists and belongs to family
    const dependentTask = await prisma.projectTask.findUnique({
      where: { id: params.taskId },
      include: {
        project: {
          select: {
            id: true,
            familyId: true,
          },
        },
      },
    });

    if (!dependentTask) {
      return NextResponse.json(
        { error: 'Dependent task not found' },
        { status: 404 }
      );
    }

    if (dependentTask.project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if blocking task exists
    const blockingTask = await prisma.projectTask.findUnique({
      where: { id: blockingTaskId },
      include: {
        project: {
          select: {
            id: true,
            familyId: true,
          },
        },
      },
    });

    if (!blockingTask) {
      return NextResponse.json(
        { error: 'Blocking task not found' },
        { status: 404 }
      );
    }

    // Check if tasks belong to the same project
    if (dependentTask.projectId !== blockingTask.projectId) {
      return NextResponse.json(
        { error: 'Tasks must belong to the same project' },
        { status: 400 }
      );
    }

    // Check if dependency already exists
    const existingDependency = await prisma.taskDependency.findFirst({
      where: {
        dependentTaskId: params.taskId,
        blockingTaskId: blockingTaskId,
      },
    });

    if (existingDependency) {
      return NextResponse.json(
        { error: 'Dependency already exists' },
        { status: 400 }
      );
    }

    // Check for circular dependencies
    const isCircular = await hasCircularDependency(params.taskId, blockingTaskId);

    if (isCircular) {
      return NextResponse.json(
        { error: 'Circular dependency detected' },
        { status: 400 }
      );
    }

    // Create dependency
    const dependency = await prisma.taskDependency.create({
      data: {
        dependentTaskId: params.taskId,
        blockingTaskId: blockingTaskId,
        dependencyType: dependencyType || 'FINISH_TO_START',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_DEPENDENCY_ADDED',
        result: 'SUCCESS',
        metadata: {
          projectId: dependentTask.project.id,
          dependencyId: dependency.id,
          dependentTaskId: dependency.dependentTaskId,
          blockingTaskId: dependency.blockingTaskId,
        },
      },
    });

    return NextResponse.json(
      { dependency, message: 'Dependency created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating dependency:', error);
    return NextResponse.json(
      { error: 'Failed to create dependency' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string; dependencyId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage tasks
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage tasks' },
        { status: 403 }
      );
    }

    // Check if dependency exists and belongs to family
    const dependency = await prisma.taskDependency.findUnique({
      where: { id: params.dependencyId },
      include: {
        dependentTask: {
          include: {
            project: {
              select: {
                id: true,
                familyId: true,
              },
            },
          },
        },
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    if (dependency.dependentTask.project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete dependency
    await prisma.taskDependency.delete({
      where: { id: params.dependencyId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_DEPENDENCY_REMOVED',
        result: 'SUCCESS',
        metadata: {
          projectId: dependency.dependentTask.project.id,
          dependencyId: dependency.id,
          dependentTaskId: dependency.dependentTaskId,
          blockingTaskId: dependency.blockingTaskId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Dependency deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting dependency:', error);
    return NextResponse.json(
      { error: 'Failed to delete dependency' },
      { status: 500 }
    );
  }
}
