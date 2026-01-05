import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing post
    const post = await prisma.communicationPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify post belongs to user's family
    if (post.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this post' },
        { status: 403 }
      );
    }

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
    const { content, title, imageUrl, isPinned } = body;

    // Build update data
    const updateData: any = {};
    let auditAction = 'POST_UPDATED';

    // Content/title updates - only author can do this
    if (content !== undefined || title !== undefined || imageUrl !== undefined) {
      if (post.authorId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the author can edit post content' },
          { status: 403 }
        );
      }

      if (content !== undefined) updateData.content = content;
      if (title !== undefined) updateData.title = title;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    }

    // Pin/unpin - only parents can do this
    if (isPinned !== undefined) {
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Only parents can pin/unpin posts' },
          { status: 403 }
        );
      }

      updateData.isPinned = isPinned;
      auditAction = isPinned ? 'POST_PINNED' : 'POST_UNPINNED';
    }

    // Update post
    const updatedPost = await prisma.communicationPost.update({
      where: { id: params.id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: auditAction as any,
        result: 'SUCCESS',
        metadata: {
          postId: updatedPost.id,
          changes: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    logger.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing post
    const post = await prisma.communicationPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify post belongs to user's family
    if (post.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }

    // Check permissions: author can delete own post, parents can delete any post
    if (post.authorId !== session.user.id && session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }

    // Delete post (cascade will delete reactions)
    await prisma.communicationPost.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'POST_DELETED',
        result: 'SUCCESS',
        metadata: {
          postId: post.id,
          postType: post.type,
          authorId: post.authorId,
        },
      },
    });

    return NextResponse.json({
      message: 'Post deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
