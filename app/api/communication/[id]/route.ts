import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateCommunicationPost, deleteCommunicationPost } from '@/lib/data/communication';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
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

    // Get existing post
    const { data: post } = await supabase
      .from('communication_posts')
      .select('family_id, author_id')
      .eq('id', id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify post belongs to user's family
    if (post.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this post' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, title, imageUrl, isPinned } = body;

    // Content/title updates - only author can do this
    if (content !== undefined || title !== undefined || imageUrl !== undefined) {
      if (post.author_id !== memberId) {
        return NextResponse.json(
          { error: 'Only the author can edit post content' },
          { status: 403 }
        );
      }
    }

    const updatedPost = await updateCommunicationPost(id, body);

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    logger.error('Update post error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
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

    // Get existing post
    const { data: post } = await supabase
      .from('communication_posts')
      .select('family_id, author_id')
      .eq('id', id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify post belongs to user's family
    if (post.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only author can delete
    if (post.author_id !== memberId) {
      return NextResponse.json(
        { error: 'Only the author can delete this post' },
        { status: 403 }
      );
    }

    await deleteCommunicationPost(id);

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    logger.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
