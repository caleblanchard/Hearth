import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

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

    let count = 0;
    if (useMockDb) {
      const result = await (dbMock as any).todoItem.deleteMany({
        where: { familyId, status: 'COMPLETED' },
      });
      count = result?.count ?? 0;
    } else {
      const { error, count: deletedCount } = await supabase
        .from('todo_items')
        .delete({ count: 'exact' })
        .eq('family_id', familyId)
        .eq('status', 'COMPLETED');

      if (error) {
        logger.error('Error clearing completed todos:', error);
        return NextResponse.json(
          { error: 'Failed to clear completed todos' },
          { status: 500 }
        );
      }
      count = deletedCount || 0;
    }

    return NextResponse.json({
      success: true,
      message: `${count} completed task${count !== 1 ? 's' : ''} cleared`,
      count,
    });
  } catch (error) {
    logger.error('Clear completed todos error:', error);
    return NextResponse.json(
      { error: 'Failed to clear completed todos' },
      { status: 500 }
    );
  }
}
