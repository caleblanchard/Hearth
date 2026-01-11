import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTodoItems, createTodoItem } from '@/lib/data/todos';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'completed' | 'all' | undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;

    // Use data module
    const todos = await getTodoItems(familyId, {
      status: status || 'pending',
      assignedTo,
    });

    return NextResponse.json({ todos });
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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, assignedTo } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Use data module
    const todo = await createTodoItem({
      family_id: familyId,
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || 'MEDIUM',
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      created_by: memberId,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
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
      { todo, message: 'Todo created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
