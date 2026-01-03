import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PostType } from '@/app/generated/prisma';

const VALID_POST_TYPES = ['ANNOUNCEMENT', 'KUDOS', 'NOTE', 'PHOTO'];

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const pinnedOnly = searchParams.get('pinned') === 'true';
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
      100  // Maximum limit
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Build query filters
    const where: any = {
      familyId: session.user.familyId,
    };

    if (type) {
      where.type = type as PostType;
    }

    if (pinnedOnly) {
      where.isPinned = true;
    }

    // Fetch posts with author and reactions
    const [posts, total] = await Promise.all([
      prisma.communicationPost.findMany({
        where,
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
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.communicationPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const { type, title, content, imageUrl } = body;

    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!type || !VALID_POST_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Valid post type is required (ANNOUNCEMENT, KUDOS, NOTE, PHOTO)' },
        { status: 400 }
      );
    }

    // Only parents can post announcements
    if (type === 'ANNOUNCEMENT' && session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can post announcements' },
        { status: 403 }
      );
    }

    // Create post
    const post = await prisma.communicationPost.create({
      data: {
        familyId: session.user.familyId,
        type: type as PostType,
        title: title?.trim() || null,
        content: content.trim(),
        imageUrl: imageUrl || null,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'POST_CREATED',
        result: 'SUCCESS',
        metadata: {
          postId: post.id,
          postType: post.type,
        },
      },
    });

    return NextResponse.json(
      {
        post,
        message: 'Post created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
