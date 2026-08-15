import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateCommunicationPost, deleteCommunicationPost } from '@/lib/data/communication';
import { insertAuditLog } from '@/lib/data/lifecycle-core';
import { logger } from '@/lib/logger';

export async function PATCH(
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

    // Check permissions
    const { role } = authContext.memberships.find(m => m.id === memberId) || {};

    // Pinning updates - only parent can do this
    if (isPinned !== undefined) {
      if (role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Only parents can pin posts' },
          { status: 403 }
        );
      }
    }

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

    // Create audit log
    if (isPinned !== undefined) {
      await insertAuditLog({
        familyId,
        memberId,
        action: isPinned ? 'POST_PINNED' : 'POST_UNPINNED',
        entityType: 'COMMUNICATION_POST',
        entityId: id,
        metadata: { title: updatedPost.title }
      });
    } else {
      await insertAuditLog({
        familyId,
        memberId,
        action: 'POST_UPDATED',
        entityType: 'COMMUNICATION_POST',
        entityId: id,
        metadata: { changes: Object.keys(body) }
      });
    }

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

    const { role } = authContext.memberships.find(m => m.id === memberId) || {};

    // Only author or parent can delete
    if (post.author_id !== memberId && role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only the author can delete this post' },
        { status: 403 }
      );
    }

    await deleteCommunicationPost(id);

    // Create audit log
    await insertAuditLog({
      familyId,
      memberId,
      action: 'POST_DELETED',
      entityType: 'COMMUNICATION_POST',
      entityId: id,
      metadata: { title: 'Deleted Post' } // Note: post details lost after delete unless we fetch before
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    logger.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
