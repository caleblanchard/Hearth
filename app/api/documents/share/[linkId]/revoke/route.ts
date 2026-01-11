import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { revokeDocumentShareLink } from '@/lib/data/documents';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
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

    // Only parents can revoke share links
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can revoke share links' },
        { status: 403 }
      );
    }

    // Verify share link belongs to family
    const { data: shareLink } = await supabase
      .from('document_share_links')
      .select('document:documents!inner(family_id)')
      .eq('id', params.linkId)
      .single();

    if (!shareLink || shareLink.document.family_id !== familyId) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    await revokeDocumentShareLink(params.linkId);

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (error) {
    logger.error('Revoke share link error:', error);
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
