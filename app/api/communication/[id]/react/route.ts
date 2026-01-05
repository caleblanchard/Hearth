import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
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

    // Add or update reaction (upsert for idempotency)
    await prisma.postReaction.upsert({
      where: {
        postId_memberId_emoji: {
          postId: params.id,
          memberId: session.user.id,
          emoji: emoji.trim(),
        },
      },
      update: {
        // Nothing to update - just return existing
      },
      create: {
        postId: params.id,
        memberId: session.user.id,
        emoji: emoji.trim(),
      },
    });

    // Get updated post with reactions
    const updatedPost = await prisma.communicationPost.findUnique({
      where: { id: params.id },
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
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    return NextResponse.json({
      post: updatedPost,
      message: 'Reaction added successfully',
    });
  } catch (error) {
    logger.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
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
        { error: 'You do not have permission to remove reactions from this post' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get('emoji');

    // Validate emoji
    if (!emoji || emoji.trim().length === 0) {
      return NextResponse.json(
        { error: 'Emoji parameter is required' },
        { status: 400 }
      );
    }

    // Remove reaction (only user's own reaction)
    await prisma.postReaction.deleteMany({
      where: {
        postId: params.id,
        memberId: session.user.id,
        emoji: emoji.trim(),
      },
    });

    // Get updated post with reactions
    const updatedPost = await prisma.communicationPost.findUnique({
      where: { id: params.id },
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
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    return NextResponse.json({
      post: updatedPost,
      message: 'Reaction removed successfully',
    });
  } catch (error) {
    logger.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
