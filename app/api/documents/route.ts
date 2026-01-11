import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getDocuments, createDocument } from '@/lib/data/documents';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'IDENTITY', 'MEDICAL', 'FINANCIAL', 'HOUSEHOLD',
  'EDUCATION', 'LEGAL', 'PETS', 'OTHER'
];

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
    const category = searchParams.get('category');

    const documents = await getDocuments(familyId, category || undefined);

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
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
    const {
      name,
      category,
      fileUrl,
      fileSize,
      mimeType,
      documentNumber,
      issuedDate,
      expiresAt,
      tags,
      notes,
      accessList,
    } = body;

    // Validate required fields
    if (!name || !category || !fileUrl || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Name, category, fileUrl, fileSize, and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const document = await createDocument(familyId, {
      name,
      category,
      fileUrl,
      fileSize,
      mimeType,
      documentNumber: documentNumber || null,
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      tags: tags || [],
      notes: notes || null,
      accessList: accessList || [],
      uploadedById: memberId,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'DOCUMENT_UPLOADED',
      entity_type: 'DOCUMENT',
      entity_id: document.id,
      result: 'SUCCESS',
      metadata: { name, category },
    });

    return NextResponse.json({
      success: true,
      document,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    logger.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
