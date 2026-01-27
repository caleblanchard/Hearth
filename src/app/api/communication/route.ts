import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/supabase/server'
import { dbMock } from '@/lib/test-utils/db-mock'
import { getCommunicationPosts, createCommunicationPost } from '@/lib/data/communication'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const familyId = authContext.activeFamilyId
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const pinnedOnly = searchParams.get('pinned') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit
    const type = searchParams.get('type') || undefined

    const postsResult = await getCommunicationPosts(familyId, {
      limit,
      offset: skip,
      pinned: pinnedOnly ? true : undefined,
      type: type as any,
      db: dbMock,
    })

    const mappedPosts = postsResult.posts.map((post: any) => ({
      id: post.id,
      familyId: post.family_id,
      type: post.type,
      title: post.title,
      content: post.content,
      imageUrl: post.image_url,
      isPinned: post.is_pinned,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: post.author
        ? {
            id: post.author.id,
            name: post.author.name,
            avatarUrl: post.author.avatar_url,
          }
        : null,
      reactions: post.reactions || [],
      _count: {
        reactions: (post.reactions || []).length,
      },
    }))

    return NextResponse.json({
      data: mappedPosts,
      pagination: {
        total: postsResult.total,
        page,
        limit,
      },
    })
  } catch (error) {
    logger.error('Error fetching posts', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authContext = await getAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const familyId = authContext.activeFamilyId
    const memberId = authContext.activeMemberId

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 })
    }

    const body = await request.json()
    const { content, type, imageUrl, title } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }
    const allowedTypes = ['ANNOUNCEMENT', 'KUDOS', 'NOTE', 'PHOTO']
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (type === 'ANNOUNCEMENT' && authContext.user?.role === 'CHILD') {
      return NextResponse.json(
        { error: 'Only parents can post announcements' },
        { status: 403 }
      )
    }

    const post = await createCommunicationPost({
      family_id: familyId,
      author_id: memberId,
      content: content.trim(),
      type: type || 'NOTE',
      title: title?.trim() || null,
      image_url: imageUrl?.trim() || null,
      is_pinned: false,
    })

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
    })

    return NextResponse.json(
      { post, message: 'Post created successfully' },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating post', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
