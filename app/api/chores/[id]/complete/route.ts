import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { completeChore } from '@/lib/data/chores';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const { id: assignmentId } = await params;
    
    // Validate JSON input
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { notes } = body;

    // Use RPC function for atomic completion with credit award
    const result = await completeChore(assignmentId, memberId, notes || '');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      chore: result.completion,
      creditsAwarded: result.credits_awarded,
      message: 'Chore completed successfully',
    });
  } catch (error) {
    logger.error('Error completing chore', error);
    return NextResponse.json({ error: 'Failed to complete chore' }, { status: 500 });
  }
}
