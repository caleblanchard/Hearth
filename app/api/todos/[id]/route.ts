import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateTodoItem, deleteTodoItem } from '@/lib/data/todos';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = await params;
    const updates = await request.json();

    // Verify todo belongs to user's family
    const { data: todo } = await supabase
      .from('todo_items')
      .select('family_id, status')
      .eq('id', id)
      .single();

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if (todo.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Add completed timestamp if status changed to COMPLETED
    if (updates.status === 'COMPLETED' && todo.status !== 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    }

    // Update todo
    const updatedTodo = await updateTodoItem(id, updates);

    return NextResponse.json({
      success: true,
      todo: updatedTodo,
      message: 'Todo updated successfully',
    });
  } catch (error) {
    logger.error('Update todo error:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = await params;

    // Verify todo belongs to user's family
    const { data: todo } = await supabase
      .from('todo_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if (todo.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete todo
    await deleteTodoItem(id);

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    logger.error('Delete todo error:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
