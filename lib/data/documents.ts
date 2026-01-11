import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Document = Database['public']['Tables']['documents']['Row']
type DocumentInsert = Database['public']['Tables']['documents']['Insert']
type DocumentUpdate = Database['public']['Tables']['documents']['Update']
type DocumentShareLink = Database['public']['Tables']['document_share_links']['Row']

/**
 * ============================================
 * DOCUMENTS
 * ============================================
 */

/**
 * Get documents for a family
 */
export async function getDocuments(
  familyId: string,
  options?: {
    category?: string
    memberId?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select(`
      *,
      uploaded_by_member:family_members!documents_uploaded_by_fkey(id, name, avatar_url)
    `)
    .eq('family_id', familyId)

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.memberId) {
    query = query.eq('member_id', options.memberId)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get expiring documents (within 30 days)
 */
export async function getExpiringDocuments(familyId: string) {
  const supabase = await createClient()

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      member:family_members(id, name)
    `)
    .eq('family_id', familyId)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', thirtyDaysFromNow.toISOString())
    .order('expiration_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Create document
 */
export async function createDocument(doc: DocumentInsert): Promise<Document> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update document
 */
export async function updateDocument(
  documentId: string,
  updates: DocumentUpdate
): Promise<Document> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) throw error
}

/**
 * ============================================
 * DOCUMENT SHARING
 * ============================================
 */

/**
 * Create share link for document
 */
export async function createDocumentShareLink(
  documentId: string,
  createdBy: string,
  data: {
    expiresAt?: string;
    expiresInDays?: number;
    maxViews?: number;
    password?: string;
    notes?: string;
  }
): Promise<DocumentShareLink> {
  const supabase = await createClient()

  // Calculate expiration
  let expiresAt: string | null = null
  if (data.expiresAt) {
    expiresAt = data.expiresAt
  } else if (data.expiresInDays) {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + data.expiresInDays)
    expiresAt = expiry.toISOString()
  }

  const { data: shareLink, error } = await supabase
    .from('document_share_links')
    .insert({
      document_id: documentId,
      share_token: crypto.randomUUID(),
      expires_at: expiresAt,
      max_views: data.maxViews || null,
      password: data.password || null,
      notes: data.notes || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error

  // Create audit log
  const { data: document } = await supabase
    .from('documents')
    .select('family_id')
    .eq('id', documentId)
    .single()

  if (document) {
    await supabase.from('audit_logs').insert({
      family_id: document.family_id,
      member_id: createdBy,
      action: 'DOCUMENT_SHARE_LINK_CREATED',
      details: {
        document_id: documentId,
        share_link_id: shareLink.id,
      },
    })
  }

  return shareLink
}

/**
 * Revoke a document share link
 */
export async function revokeDocumentShareLink(linkId: string) {
  const supabase = await createClient()

  // Get link details for audit log
  const { data: link } = await supabase
    .from('document_share_links')
    .select(`
      document_id,
      created_by,
      document:documents(family_id)
    `)
    .eq('id', linkId)
    .single()

  // Mark as revoked by setting expires_at to now
  const { data, error } = await supabase
    .from('document_share_links')
    .update({
      expires_at: new Date().toISOString(),
      revoked_at: new Date().toISOString(),
    })
    .eq('id', linkId)
    .select()
    .single()

  if (error) throw error

  // Create audit log
  if (link?.document) {
    await supabase.from('audit_logs').insert({
      family_id: link.document.family_id,
      member_id: link.created_by,
      action: 'DOCUMENT_SHARE_LINK_REVOKED',
      details: {
        document_id: link.document_id,
        share_link_id: linkId,
      },
    })
  }

  return data
}

/**
 * Get document by share token
 */
export async function getDocumentByShareToken(shareToken: string) {
  const supabase = await createClient()

  const { data: link, error: linkError } = await supabase
    .from('document_share_links')
    .select(`
      *,
      document:documents(*)
    `)
    .eq('share_token', shareToken)
    .maybeSingle()

  if (linkError) throw linkError
  if (!link) throw new Error('Share link not found')

  // Check if expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error('Share link expired')
  }

  // Check if max views reached
  if (link.max_views && link.view_count >= link.max_views) {
    throw new Error('Share link view limit reached')
  }

  // Increment view count
  await supabase
    .from('document_share_links')
    .update({ view_count: (link.view_count || 0) + 1 })
    .eq('id', link.id)

  return link.document
}
