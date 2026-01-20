import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
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

    // Only parents can revoke share links
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can revoke share links' },
        { status: 403 }
      );
    }

    // Verify share link belongs to family
    const { data: shareLink } = await supabase
      .from('document_share_links')
      .select(`
        *,
        document:documents!inner(id, family_id, name)
      `)
      .eq('id', linkId)
      .single();

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (shareLink.document.family_id !== familyId) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 403 });
    }

    if (shareLink.revoked_at || shareLink.revokedAt) {
      return NextResponse.json(
        { error: 'Share link is already revoked' },
        { status: 400 }
      );
    }

    const revokedAt = new Date();
    const { data: updatedLink, error: updateError } = await supabase
      .from('document_share_links')
      .update({
        revoked_at: revokedAt,
        revoked_by: memberId,
      })
      .eq('id', linkId)
      .select()
      .single();

    if (updateError || !updatedLink) {
      throw updateError;
    }

    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'DOCUMENT_SHARED',
      result: 'SUCCESS',
      metadata: {
        documentId: shareLink.document.id,
        documentName: shareLink.document.name,
        shareLinkId: shareLink.id,
        action: 'revoked',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
      shareLink: updatedLink,
    });
  } catch (error) {
    logger.error('Revoke share link error:', error);
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
