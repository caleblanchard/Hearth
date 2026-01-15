import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function DELETE() {
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

    // Delete all completed todos for the family
    const { error, count } = await supabase
      .from('todo_items')
      .delete({ count: 'exact' })
      .eq('family_id', familyId)
      .eq('status', 'COMPLETED');

    if (error) {
      logger.error('Error clearing completed todos:', error);
      return NextResponse.json({ error: 'Failed to clear completed todos' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${count || 0} completed task${count !== 1 ? 's' : ''} cleared`,
      count: count || 0,
    });
  } catch (error) {
    logger.error('Clear completed todos error:', error);
    return NextResponse.json(
      { error: 'Failed to clear completed todos' },
      { status: 500 }
    );
  }
}
