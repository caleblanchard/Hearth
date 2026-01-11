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

    const familyId = authContext.defaultFamilyId;
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

    return NextResponse.json({ posts, total: posts.length });
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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { content, category, imageUrl } = body;

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
      category: category || 'NOTE',
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
        category: post.category,
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
