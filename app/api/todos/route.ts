import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TodoStatus } from '@/app/generated/prisma';

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

    // Fetch todos for the family
    const todos = await prisma.todoItem.findMany({
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
    });

    return NextResponse.json({ todos, currentUserId: userId });
  } catch (error) {
    console.error('Todos API error:', error);
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

    const { title, description, assignedToId, dueDate, priority, category, notes } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const { familyId } = session.user;

    // Create todo
    const todo = await prisma.todoItem.create({
      data: {
        familyId,
        title: title.trim(),
        description: description || null,
        createdById: session.user.id,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        category: category || null,
        status: 'PENDING',
        notes: notes || null,
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
    console.error('Create todo error:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
