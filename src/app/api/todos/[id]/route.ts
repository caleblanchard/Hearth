import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { TodoStatus } from '@/lib/enums';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = await params;
    const updates = await request.json();

    // Verify todo belongs to user's family
    const todo = useMockDb
      ? await (dbMock as any).todoItem.findUnique({
          where: { id },
          select: { familyId: true, status: true },
        })
      : (await supabase
          .from('todo_items')
          .select('family_id, status')
          .eq('id', id)
          .single()).data;

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if ((todo as any).family_id ? (todo as any).family_id !== familyId : (todo as any).familyId !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Add completed timestamp if status changed to COMPLETED
    const data = {
      ...updates,
      ...(updates.status === TodoStatus.COMPLETED &&
      (todo as any).status !== TodoStatus.COMPLETED
        ? { completed_at: new Date().toISOString() }
        : {}),
    };

    const updatedTodo = useMockDb
      ? await (dbMock as any).todoItem.update({
          where: { id },
          data: {
            ...updates,
            ...(updates.status === TodoStatus.COMPLETED &&
            (todo as any).status !== TodoStatus.COMPLETED
              ? { completedAt: new Date() }
              : {}),
          },
          include: {
            createdBy: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        })
      : (await supabase
          .from('todo_items')
          .update(data)
          .eq('id', id)
          .select(
            `
            *,
            created_by:family_members!todo_items_created_by_id_fkey(id, name),
            assigned_to:family_members!todo_items_assigned_to_id_fkey(id, name)
          `
          )
          .single()).data;

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

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { id } = await params;

    // Verify todo belongs to user's family
    const todo = useMockDb
      ? await (dbMock as any).todoItem.findUnique({
          where: { id },
          select: { familyId: true },
        })
      : (await supabase
          .from('todo_items')
          .select('family_id')
          .eq('id', id)
          .single()).data;

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    if ((todo as any).family_id ? (todo as any).family_id !== familyId : (todo as any).familyId !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (useMockDb) {
      await (dbMock as any).todoItem.delete({ where: { id } });
    } else {
      await supabase.from('todo_items').delete().eq('id', id);
    }

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
