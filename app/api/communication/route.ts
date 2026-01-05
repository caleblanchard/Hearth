import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PostType } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeHTML } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { parseJsonBody } from '@/lib/request-validation';

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
    
    // Use pagination utilities
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = (page - 1) * limit;

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
        skip,
        take: limit,
      }),
      prisma.communicationPost.count({ where }),
    ]);

    return NextResponse.json(createPaginationResponse(posts, page, limit, total));
  } catch (error) {
    logger.error('Error fetching posts', error);
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

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { type, title, content, imageUrl } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedContent = sanitizeHTML(content);
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const sanitizedType = sanitizeString(type);
    if (!sanitizedType || !VALID_POST_TYPES.includes(sanitizedType)) {
      return NextResponse.json(
        { error: 'Valid post type is required (ANNOUNCEMENT, KUDOS, NOTE, PHOTO)' },
        { status: 400 }
      );
    }

    const sanitizedTitle = title ? sanitizeString(title) : null;
    const sanitizedImageUrl = imageUrl ? sanitizeString(imageUrl) : null;

    // Only parents can post announcements
    if (sanitizedType === 'ANNOUNCEMENT' && session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can post announcements' },
        { status: 403 }
      );
    }

    // Create post
    const post = await prisma.communicationPost.create({
      data: {
        familyId: session.user.familyId,
        type: sanitizedType as PostType,
        title: sanitizedTitle,
        content: sanitizedContent,
        imageUrl: sanitizedImageUrl,
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
    logger.error('Error creating post', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
