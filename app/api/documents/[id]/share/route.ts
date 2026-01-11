import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { createDocumentShareLink } from '@/lib/data/documents';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only parents can create share links
    const isParent = await isParentInFamily(memberId, familyId);
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
