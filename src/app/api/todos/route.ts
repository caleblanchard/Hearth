import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { TodoStatus } from '@/lib/enums';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

const normalizeTodo = (todo: any) => ({
  id: todo.id,
  title: todo.title,
  description: todo.description,
  priority: todo.priority,
  status: todo.status,
  dueDate: todo.due_date ?? todo.dueDate ?? null,
  category: todo.category,
  notes: todo.notes,
  createdAt: todo.created_at ?? todo.createdAt,
  completedAt: todo.completed_at ?? todo.completedAt ?? null,
  familyId: todo.family_id ?? todo.familyId,
  assigned_to: todo.assigned_to ?? todo.assignedTo ?? null,
  created_by: todo.created_by ?? todo.createdBy,
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'active';

    if (useMockDb) {
      const where: Record<string, unknown> = { familyId };
      if (filter !== 'all') {
        where.status =
          filter === 'completed' ? TodoStatus.COMPLETED : TodoStatus.PENDING;
      }

      const todos = await (dbMock as any).todoItem.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });
      const count = await (dbMock as any).todoItem.count({ where });

      return NextResponse.json({ data: todos || [], count: count || 0 });
    }

    const { data: todos, error } = await supabase
      .from('todo_items')
      .select(
        `
        *,
        assigned_to:family_members!todo_items_assigned_to_id_fkey(id, name),
        created_by:family_members!todo_items_created_by_id_fkey(id, name)
      `
      )
      .eq('family_id', familyId)
      .match(
        filter === 'all'
          ? {}
          : {
              status:
                filter === 'completed' ? TodoStatus.COMPLETED : TodoStatus.PENDING,
            }
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { count } = await supabase
      .from('todo_items')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .match(
        filter === 'all'
          ? {}
          : {
              status:
                filter === 'completed' ? TodoStatus.COMPLETED : TodoStatus.PENDING,
            }
      );

    return NextResponse.json({ data: (todos || []).map(normalizeTodo), count: count || 0, currentUserId: memberId });
  } catch (error) {
    logger.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      assignedToId,
      category,
      notes,
    } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const resolvedAssignedToId = assignedToId ?? assignedTo ?? null;
    if (useMockDb) {
      const todo = await (dbMock as any).todoItem.create({
        data: {
          familyId,
          title: title.trim(),
          description: description?.trim() || null,
          createdById: memberId,
          assignedToId: resolvedAssignedToId,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || 'MEDIUM',
          category: category || null,
          status: TodoStatus.PENDING,
          notes: notes || null,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(
        { success: true, todo, message: 'Todo created successfully' },
        { status: 200 }
      );
    }

    const { data: todo, error } = await supabase
      .from('todo_items')
      .insert({
        family_id: familyId,
        title: title.trim(),
        description: description?.trim() || null,
        created_by_id: memberId,
        assigned_to_id: resolvedAssignedToId,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority: priority || 'MEDIUM',
        category: category || null,
        status: TodoStatus.PENDING,
        notes: notes || null,
      })
      .select(
        `
        *,
        created_by:family_members!todo_items_created_by_id_fkey(id, name),
        assigned_to:family_members!todo_items_assigned_to_id_fkey(id, name)
      `
      )
      .single();

    if (error) throw error;

    // Create audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'TODO_CREATED',
      entity_type: 'TODO',
      entity_id: todo.id,
      result: 'SUCCESS',
      metadata: {
        title: todo.title,
        priority: todo.priority,
      },
    });

    return NextResponse.json(
      { success: true, todo: normalizeTodo(todo), message: 'Todo created successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
