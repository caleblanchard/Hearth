import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { createDocumentShareLink } from '@/lib/data/documents';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;

    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Verify document belongs to family
    const { data: document } = await supabase
      .from('documents')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!document || document.family_id !== familyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get all share links for this document
    const { data: shareLinks, error } = await supabase
      .from('document_share_links')
      .select(`
        *,
        creator:family_members!document_share_links_created_by_fkey(id, name)
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ shareLinks: shareLinks || [] });
  } catch (error) {
    logger.error('Get document share links error:', error);
    return NextResponse.json({ error: 'Failed to get share links' }, { status: 500 });
  }
}

export async function POST(
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

    // Only parents can create share links
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create share links' },
        { status: 403 }
      );
    }

    // Verify document belongs to family
    const { data: document } = await supabase
      .from('documents')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!document || document.family_id !== familyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await request.json();
    const shareLink = await createDocumentShareLink(id, memberId, body);

    return NextResponse.json({
      success: true,
      shareLink,
      message: 'Share link created successfully',
    });
  } catch (error) {
    logger.error('Create document share link error:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
