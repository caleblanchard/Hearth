import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PROJECT_TEMPLATES, getTemplateById } from '@/lib/projects/templates';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    return NextResponse.json({ templates: PROJECT_TEMPLATES });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create projects
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { templateId, customizations } = body;

    // Validate templateId
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Get template
    const template = getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Calculate dates
    const startDate = customizations?.startDate
      ? new Date(customizations.startDate)
      : new Date();

    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + template.estimatedDays);

    // Create project
    const project = await prisma.project.create({
      data: {
        familyId: session.user.familyId,
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        status: 'ACTIVE',
        startDate: startDate,
        dueDate: dueDate,
        budget: customizations?.budget !== undefined ? customizations.budget : template.suggestedBudget,
        notes: customizations?.notes || null,
        createdById: session.user.id,
      },
    });

    // Create tasks with dependencies
    const taskMap = new Map<string, string>(); // Map template task name to created task ID

    // First pass: Create all tasks without dependencies
    for (let i = 0; i < template.tasks.length; i++) {
      const taskTemplate = template.tasks[i];

      // Calculate task due date
      let taskDueDate = null;
      if (taskTemplate.daysFromStart !== undefined) {
        taskDueDate = new Date(startDate);
        taskDueDate.setDate(taskDueDate.getDate() + taskTemplate.daysFromStart);
      }

      const task = await prisma.projectTask.create({
        data: {
          projectId: project.id,
          name: taskTemplate.name,
          description: taskTemplate.description,
          status: 'PENDING',
          dueDate: taskDueDate,
          estimatedHours: taskTemplate.estimatedHours,
          sortOrder: i,
        },
      });

      taskMap.set(taskTemplate.name, task.id);
    }

    // Second pass: Create dependencies
    for (const taskTemplate of template.tasks) {
      if (taskTemplate.dependsOn && taskTemplate.dependsOn.length > 0) {
        const dependentTaskId = taskMap.get(taskTemplate.name);

        if (dependentTaskId) {
          for (const blockingTaskName of taskTemplate.dependsOn) {
            const blockingTaskId = taskMap.get(blockingTaskName);

            if (blockingTaskId) {
              await prisma.taskDependency.create({
                data: {
                  dependentTaskId: dependentTaskId,
                  blockingTaskId: blockingTaskId,
                  dependencyType: 'FINISH_TO_START',
                },
              });
            }
          }
        }
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_CREATED',
        result: 'SUCCESS',
        metadata: {
          projectId: project.id,
          name: project.name,
          templateId: templateId,
          tasksCreated: template.tasks.length,
        },
      },
    });

    // Fetch complete project with tasks
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        tasks: {
          include: {
            _count: {
              select: {
                dependencies: true,
                dependents: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        project: completeProject,
        message: 'Project created from template successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating project from template:', error);
    return NextResponse.json(
      { error: 'Failed to create project from template' },
      { status: 500 }
    );
  }
}
