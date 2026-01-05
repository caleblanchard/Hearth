import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'];

export async function GET(
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

    const task = await prisma.projectTask.findUnique({
      where: { id: params.taskId },
      include: {
        project: {
          select: {
            id: true,
            familyId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        dependencies: {
          include: {
            blockingTask: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        dependents: {
          include: {
            dependentTask: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check family access
    if (task.project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    logger.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check if task exists and belongs to family
    const existingTask = await prisma.projectTask.findUnique({
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

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existingTask.project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      notes,
      status,
      assigneeId,
      dueDate,
      estimatedHours,
      actualHours,
      sortOrder,
    } = body;

    // Validate name if provided
    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate hours
    if (estimatedHours !== undefined && estimatedHours !== null && estimatedHours < 0) {
      return NextResponse.json(
        { error: 'Estimated hours must be a positive number' },
        { status: 400 }
      );
    }

    if (actualHours !== undefined && actualHours !== null && actualHours < 0) {
      return NextResponse.json(
        { error: 'Actual hours must be a positive number' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours !== null ? parseFloat(estimatedHours) : null;
    if (actualHours !== undefined) updateData.actualHours = actualHours !== null ? parseFloat(actualHours) : null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // Update task
    const updatedTask = await prisma.projectTask.update({
      where: { id: params.taskId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            familyId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        dependencies: {
          include: {
            blockingTask: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        dependents: {
          include: {
            dependentTask: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_TASK_UPDATED',
        result: 'SUCCESS',
        metadata: {
          projectId: existingTask.project.id,
          taskId: updatedTask.id,
          updates: body,
        },
      },
    });

    return NextResponse.json(
      { task: updatedTask, message: 'Task updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if task exists and belongs to family
    const task = await prisma.projectTask.findUnique({
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

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete task (cascade will handle dependencies)
    await prisma.projectTask.delete({
      where: { id: params.taskId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_TASK_DELETED',
        result: 'SUCCESS',
        metadata: {
          projectId: task.project.id,
          taskId: task.id,
          name: task.name,
        },
      },
    });

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
