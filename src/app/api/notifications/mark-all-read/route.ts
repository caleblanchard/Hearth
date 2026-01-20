import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authContext.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
    }

    const count = typeof data?.count === 'number' ? data.count : 0
    const message =
      count === 1
        ? 'Marked 1 notification as read'
        : `Marked ${count} notifications as read`

    return NextResponse.json({
      success: true,
      count,
      message,
    });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
