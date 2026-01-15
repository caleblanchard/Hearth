import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const supabase = await createClient();
    
    const { data: shareLink } = await supabase
      .from('document_share_links')
      .select(`
        *,
        document:documents(
          *,
          uploader:family_members(
            id,
            name
          )
        )
      `)
      .eq('token', token)
      .single();

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if link is revoked
    if (shareLink.revoked_at) {
      return NextResponse.json(
        { error: 'Share link has been revoked' },
        { status: 410 }
      );
    }

    // Check if link is expired
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Increment access count and update last accessed time
    await supabase
      .from('document_share_links')
      .update({
        access_count: shareLink.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id);

    // Create document access log for external access
    await supabase
      .from('document_access_logs')
      .insert({
        document_id: shareLink.document_id,
        accessed_by: null, // External access
        ip_address: 'unknown',
        user_agent: 'unknown',
        via_share_link: shareLink.id,
      });

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        family_id: shareLink.document.family_id,
        member_id: shareLink.created_by,
        action: 'DOCUMENT_SHARE_ACCESSED',
        result: 'SUCCESS',
        details: {
          documentId: shareLink.document_id,
          documentName: shareLink.document.name,
          shareLinkId: shareLink.id,
          token: token,
        },
      });

    return NextResponse.json({
      document: {
        id: shareLink.document.id,
        name: shareLink.document.name,
        category: shareLink.document.category,
        fileUrl: shareLink.document.file_url,
        fileSize: shareLink.document.file_size,
        mimeType: shareLink.document.mime_type,
        notes: shareLink.document.notes,
        uploader: shareLink.document.uploader,
      },
      shareInfo: {
        createdAt: shareLink.created_at,
        expiresAt: shareLink.expires_at,
        createdBy: shareLink.created_by,
      },
    });
  } catch (error) {
    logger.error('Error accessing shared document:', error);
    return NextResponse.json(
      { error: 'Failed to access shared document' },
      { status: 500 }
    );
  }
}
