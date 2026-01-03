import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage projects
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    // Check if project exists and belongs to family
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            dependencies: true,
            dependents: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check if project exists and belongs to family
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      status,
      assigneeId,
      dueDate,
      estimatedHours,
      actualHours,
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Task name is required' },
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

    // Get current task count for sortOrder
    const taskCount = await prisma.projectTask.count({
      where: { projectId: params.id },
    });

    // Create task
    const task = await prisma.projectTask.create({
      data: {
        projectId: params.id,
        name: name.trim(),
        description: description?.trim() || null,
        status: status || 'PENDING',
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours !== undefined && estimatedHours !== null ? parseFloat(estimatedHours) : null,
        actualHours: actualHours !== undefined && actualHours !== null ? parseFloat(actualHours) : null,
        sortOrder: taskCount,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_TASK_CREATED',
        result: 'SUCCESS',
        metadata: {
          projectId: params.id,
          taskId: task.id,
          name: task.name,
        },
      },
    });

    return NextResponse.json(
      { task, message: 'Task created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
