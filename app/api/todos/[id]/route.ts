import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const updates = await request.json();

    // Verify todo belongs to user's family
    const todo = await prisma.todoItem.findUnique({
      where: { id },
    });

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if (todo.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update todo
    const updatedTodo = await prisma.todoItem.update({
      where: { id },
      data: {
        ...updates,
        completedAt: updates.status === 'COMPLETED' ? new Date() : todo.completedAt,
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
      todo: updatedTodo,
      message: 'Todo updated successfully',
    });
  } catch (error) {
    console.error('Update todo error:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify todo belongs to user's family
    const todo = await prisma.todoItem.findUnique({
      where: { id },
    });

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if (todo.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete todo
    await prisma.todoItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    console.error('Delete todo error:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
