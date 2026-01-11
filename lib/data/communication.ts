import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type CommunicationPost = Database['public']['Tables']['communication_posts']['Row']
type CommunicationPostInsert = Database['public']['Tables']['communication_posts']['Insert']
type CommunicationPostUpdate = Database['public']['Tables']['communication_posts']['Update']
type PostReaction = Database['public']['Tables']['post_reactions']['Row']

/**
 * ============================================
 * COMMUNICATION POSTS
 * ============================================
 */

/**
 * Get all posts for a family
 */
export async function getCommunicationPosts(
  familyId: string,
  options?: {
    limit?: number
    offset?: number
    pinned?: boolean
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url, role),
      reactions:post_reactions(
        id,
        reaction_type,
        member:family_members(id, name, avatar_url)
      )
    `)
    .eq('family_id', familyId)

  if (options?.pinned !== undefined) {
    query = query.eq('is_pinned', options.pinned)
  }

  query = query.order('is_pinned', { ascending: false })
  query = query.order('created_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a single post by ID
 */
export async function getCommunicationPost(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url, role),
      reactions:post_reactions(
        id,
        reaction_type,
        created_at,
        member:family_members(id, name, avatar_url)
      )
    `)
    .eq('id', postId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a communication post
 */
export async function createCommunicationPost(
  post: CommunicationPostInsert
): Promise<CommunicationPost> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .insert(post)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a communication post
 */
export async function updateCommunicationPost(
  postId: string,
  updates: CommunicationPostUpdate
): Promise<CommunicationPost> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a communication post
 */
export async function deleteCommunicationPost(postId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('communication_posts')
    .delete()
    .eq('id', postId)

  if (error) throw error
}

/**
 * Pin/unpin a post
 */
export async function togglePostPin(postId: string, isPinned: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .update({ is_pinned: isPinned })
    .eq('id', postId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get pinned posts for a family
 */
export async function getPinnedPosts(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url),
      reactions:post_reactions(
        id,
        reaction_type,
        member:family_members(id, name)
      )
    `)
    .eq('family_id', familyId)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * POST REACTIONS
 * ============================================
 */

/**
 * Add a reaction to a post
 */
export async function addPostReaction(
  postId: string,
  memberId: string,
  reactionType: string
): Promise<PostReaction> {
  const supabase = await createClient()

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    // Update existing reaction
    const { data, error } = await supabase
      .from('post_reactions')
      .update({ reaction_type: reactionType })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new reaction
    const { data, error } = await supabase
      .from('post_reactions')
      .insert({
        post_id: postId,
        member_id: memberId,
        reaction_type: reactionType,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Remove a reaction from a post
 */
export async function removePostReaction(postId: string, memberId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('member_id', memberId)

  if (error) throw error
}

/**
 * Get reactions for a post
 */
export async function getPostReactions(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('post_reactions')
    .select(`
      *,
      member:family_members(id, name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get reaction summary for a post (grouped by type)
 */
export async function getPostReactionSummary(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('post_reactions')
    .select('reaction_type, member_id')
    .eq('post_id', postId)

  if (error) throw error

  const reactions = data || []
  const summary = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction_type]) {
      acc[reaction.reaction_type] = []
    }
    acc[reaction.reaction_type].push(reaction.member_id)
    return acc
  }, {} as Record<string, string[]>)

  return summary
}

/**
 * ============================================
 * COMMUNICATION UTILITIES
 * ============================================
 */

/**
 * Search posts
 */
export async function searchPosts(
  familyId: string,
  query: string,
  limit = 20
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .or(`content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(
  familyId: string,
  category: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url),
      reactions:post_reactions(id, reaction_type)
    `)
    .eq('family_id', familyId)
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get recent posts (last 7 days)
 */
export async function getRecentPosts(familyId: string, days = 7) {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data, error } = await supabase
    .from('communication_posts')
    .select(`
      *,
      author:family_members!communication_posts_author_id_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
