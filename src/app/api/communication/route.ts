import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCommunicationPosts, createCommunicationPost } from '@/lib/data/communication';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const pinnedOnly = searchParams.get('pinned') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Use data module
    const posts = await getCommunicationPosts(familyId, {
      limit,
      pinned: pinnedOnly ? true : undefined,
    });

    // Map to camelCase for frontend
    const mappedPosts = posts.map(post => ({
      id: post.id,
      familyId: post.family_id,
      content: post.content,
      isPinned: post.is_pinned,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: post.author ? {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatar_url,
      } : null,
      reactions: post.reactions || [],
      _count: {
        reactions: (post.reactions || []).length,
      },
    }));

    return NextResponse.json({ posts: mappedPosts, total: mappedPosts.length });
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

    const body = await request.json();
    const { content, type, imageUrl } = body;

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Use data module
    const post = await createCommunicationPost({
      family_id: familyId,
      author_id: memberId,
      content: content.trim(),
      type: type || 'NOTE',
      image_url: imageUrl?.trim() || null,
      is_pinned: false,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'POST_CREATED',
      entity_type: 'COMMUNICATION',
      entity_id: post.id,
      result: 'SUCCESS',
      metadata: {
        type: post.type,
      },
    });

    return NextResponse.json(
      { post, message: 'Post created successfully' },
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
