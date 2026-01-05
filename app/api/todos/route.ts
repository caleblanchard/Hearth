import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TodoStatus } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { parseJsonBody } from '@/lib/request-validation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, id: userId } = session.user;

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'active';

    // Determine status filter based on filter param
    let statusFilter: TodoStatus[];
    if (filter === 'completed') {
      statusFilter = [TodoStatus.COMPLETED];
    } else if (filter === 'all') {
      statusFilter = [TodoStatus.PENDING, TodoStatus.IN_PROGRESS, TodoStatus.COMPLETED];
    } else {
      // Default to active (pending + in progress)
      statusFilter = [TodoStatus.PENDING, TodoStatus.IN_PROGRESS];
    }

    // Parse pagination
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    // Fetch todos for the family with pagination
    const [todos, total] = await Promise.all([
      prisma.todoItem.findMany({
        where: {
          familyId,
          status: {
            in: statusFilter,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.todoItem.count({
        where: {
          familyId,
          status: {
            in: statusFilter,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ...createPaginationResponse(todos, page, limit, total),
      currentUserId: userId,
    });
  } catch (error) {
    logger.error('Todos API error', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { title, description, assignedToId, dueDate, priority, category, notes } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedTitle = sanitizeString(title);
    if (!sanitizedTitle || sanitizedTitle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const sanitizedDescription = description ? sanitizeString(description) : null;
    const sanitizedCategory = category ? sanitizeString(category) : null;
    const sanitizedNotes = notes ? sanitizeString(notes) : null;

    const { familyId } = session.user;

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const sanitizedPriority = priority && validPriorities.includes(priority) ? priority : 'MEDIUM';

    // Create todo
    const todo = await prisma.todoItem.create({
      data: {
        familyId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        createdById: session.user.id,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: sanitizedPriority,
        category: sanitizedCategory,
        status: 'PENDING',
        notes: sanitizedNotes,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      todo,
      message: 'Todo created successfully',
    });
  } catch (error) {
    logger.error('Create todo error', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
