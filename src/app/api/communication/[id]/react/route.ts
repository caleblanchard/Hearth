import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { addPostReaction, removePostReaction, getCommunicationPost } from '@/lib/data/communication';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Get existing post
    const { data: post } = await supabase
      .from('communication_posts')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify post belongs to user's family
    if (post.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to react to this post' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emoji } = body;

    // Validate emoji
    if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      );
    }

    const reaction = await addPostReaction(id, memberId, emoji.trim());
    const updatedPost = await getCommunicationPost(id);

    return NextResponse.json({
      success: true,
      reaction,
      post: updatedPost,
      message: 'Reaction added successfully',
    });
  } catch (error) {
    logger.error('Add reaction error:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Get existing post
    const { data: post } = await supabase
      .from('communication_posts')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Try to get emoji from body first, then query params
    let emoji: string | undefined;
    try {
      const body = await request.json();
      emoji = body.emoji;
    } catch {
      // Body might be empty or invalid JSON
    }

    if (!emoji) {
      const url = new URL(request.url);
      const searchParams = url.searchParams;
      emoji = searchParams.get('emoji') || undefined;
    }

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    await removePostReaction(id, memberId, emoji);
    
    const updatedPost = await getCommunicationPost(id);

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Reaction removed successfully',
    });
  } catch (error) {
    logger.error('Remove reaction error:', error);
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }
}
